import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { initiateStkPush, normalisePhone } from "@/lib/payhero/client";
import {
  periodEnd,
  platformPayHeroCreds,
  priceFor,
  type BillingCycle,
  type PlanRow,
} from "@/lib/billing/plans";

const schema = z.object({
  plan_code: z.string().min(1),
  billing_cycle: z.enum(["monthly", "annual"]),
  phone: z.string().min(9),
});

type DB = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (c: string, v: string) => {
        maybeSingle?: () => Promise<{ data: unknown; error: { message: string } | null }>;
        single?: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    insert: (v: Record<string, unknown>) => {
      select: () => {
        single: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { plan_code, billing_cycle, phone } = parsed.data;
  const cycle: BillingCycle = billing_cycle;

  const supabase = await createServiceClient();
  const db = supabase as unknown as DB;

  const planRes = await db
    .from("subscription_plans")
    .select(
      "id, code, name, description, price_monthly, price_annual, currency_code, trial_days, max_users, max_invoices_per_mo, features, is_public, is_active, sort_order"
    )
    .eq("code", plan_code)
    .maybeSingle!();

  if (planRes.error || !planRes.data) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const plan = planRes.data as PlanRow;
  if (!plan.is_active) {
    return NextResponse.json({ error: "Plan is not available" }, { status: 400 });
  }

  const amount = priceFor(plan, cycle);
  if (plan.code === "enterprise") {
    return NextResponse.json(
      { error: "Contact sales for Enterprise plans" },
      { status: 400 }
    );
  }

  // Free plans (trial) — activate immediately without charge
  if (amount <= 0) {
    const start = new Date();
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + Math.max(1, plan.trial_days || 14));

    await db
      .from("tenants")
      .update({
        plan_id: plan.id,
        subscription_plan: plan.code,
        subscription_status: "trial",
        billing_cycle: cycle,
        billing_phone: phone,
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        trial_ends_at: end.toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    return NextResponse.json({
      data: {
        activated: true,
        plan: plan.code,
        cycle,
        period_end: end.toISOString(),
      },
    });
  }

  const creds = platformPayHeroCreds();
  if (!creds) {
    return NextResponse.json(
      { error: "Billing is not configured. Contact support." },
      { status: 503 }
    );
  }

  const now = new Date();
  const end = periodEnd(now, cycle);
  const invoiceNumber = `SUB-${Date.now().toString(36).toUpperCase()}`;

  const createRes = await db
    .from("subscription_invoices")
    .insert({
      tenant_id: tenantId,
      plan_id: plan.id,
      invoice_number: invoiceNumber,
      billing_cycle: cycle,
      period_start: now.toISOString(),
      period_end: end.toISOString(),
      amount,
      currency_code: plan.currency_code || "KES",
      status: "pending",
      created_by: userId,
    })
    .select()
    .single();

  if (createRes.error || !createRes.data) {
    return NextResponse.json(
      { error: createRes.error?.message ?? "Could not create invoice" },
      { status: 500 }
    );
  }

  const invoice = createRes.data as { id: string; invoice_number: string };

  const origin = new URL(req.url).origin;
  const callback_url = `${origin}/api/billing/payhero-webhook`;

  try {
    const resp = await initiateStkPush(
      { api_username: creds.api_username, api_password: creds.api_password },
      {
        amount,
        phone,
        channel_id: creds.channel_id,
        external_reference: invoice.invoice_number,
        callback_url,
        customer_name: session.user.name ?? undefined,
      }
    );

    const requestId =
      (resp as { CheckoutRequestID?: string; reference?: string })
        .CheckoutRequestID ??
      (resp as { reference?: string }).reference ??
      null;

    await db
      .from("subscription_invoices")
      .update({
        payhero_request_id: requestId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    await db.from("subscription_events").insert({
      tenant_id: tenantId,
      invoice_id: invoice.id,
      event_type: "checkout_initiated",
      payload: {
        plan: plan.code,
        cycle,
        amount,
        phone: normalisePhone(phone),
        request_id: requestId,
      },
    });

    return NextResponse.json({
      data: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        request_id: requestId,
        amount,
        plan: plan.code,
        cycle,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payment request failed";
    await db
      .from("subscription_invoices")
      .update({
        status: "failed",
        failure_reason: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    await db.from("subscription_events").insert({
      tenant_id: tenantId,
      invoice_id: invoice.id,
      event_type: "checkout_failed",
      payload: { error: msg },
    });

    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
