import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type DB = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (c: string, v: string) => {
        maybeSingle?: () => Promise<{ data: unknown; error: { message: string } | null }>;
        order?: (
          c: string,
          o: { ascending: boolean }
        ) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    update: (v: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

type Payload = {
  status?: string;
  Status?: string;
  CheckoutRequestID?: string;
  checkout_request_id?: string;
  reference?: string;
  external_reference?: string;
  ExternalReference?: string;
  MpesaReceiptNumber?: string;
  mpesa_receipt_number?: string;
  TransactionReference?: string;
  ResultDesc?: string;
  failure_reason?: string;
};

type Invoice = {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  status: string;
  billing_cycle: "monthly" | "annual";
  period_start: string;
  period_end: string;
  payhero_receipt: string | null;
};

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as Payload | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const db = supabase as unknown as DB;

  const requestId =
    payload.CheckoutRequestID ??
    payload.checkout_request_id ??
    payload.reference ??
    null;
  const externalRef = payload.external_reference ?? payload.ExternalReference ?? null;

  let invoice: Invoice | null = null;

  if (requestId) {
    const res = await db
      .from("subscription_invoices")
      .select("id, tenant_id, plan_id, status, billing_cycle, period_start, period_end, payhero_receipt")
      .eq("payhero_request_id", requestId)
      .maybeSingle!();
    if (!res.error) invoice = res.data as Invoice | null;
  }

  if (!invoice && externalRef) {
    const byRefChain = db
      .from("subscription_invoices")
      .select("id, tenant_id, plan_id, status, billing_cycle, period_start, period_end, payhero_receipt")
      .eq("invoice_number", externalRef);
    const res = await byRefChain.maybeSingle!();
    if (!res.error) invoice = res.data as Invoice | null;
  }

  await db.from("subscription_events").insert({
    tenant_id: invoice?.tenant_id ?? null,
    invoice_id: invoice?.id ?? null,
    event_type: `webhook:${payload.status ?? payload.Status ?? "unknown"}`,
    payload,
  });

  if (!invoice) {
    return NextResponse.json({ ok: true, matched: false });
  }

  const rawStatus = String(payload.status ?? payload.Status ?? "").toLowerCase();
  let status: "paid" | "failed" | "cancelled" | "pending" = "pending";
  if (rawStatus.includes("success") || rawStatus === "completed") status = "paid";
  else if (rawStatus.includes("cancel")) status = "cancelled";
  else if (rawStatus.includes("fail") || rawStatus.includes("error")) status = "failed";

  const providerRef =
    payload.MpesaReceiptNumber ??
    payload.mpesa_receipt_number ??
    payload.TransactionReference ??
    null;

  const now = new Date().toISOString();

  await db
    .from("subscription_invoices")
    .update({
      status,
      payhero_receipt: providerRef,
      paid_at: status === "paid" ? now : null,
      failure_reason:
        status === "paid"
          ? null
          : payload.ResultDesc ?? payload.failure_reason ?? null,
      updated_at: now,
    })
    .eq("id", invoice.id);

  if (status === "paid") {
    await db
      .from("tenants")
      .update({
        plan_id: invoice.plan_id,
        subscription_status: "active",
        billing_cycle: invoice.billing_cycle,
        current_period_start: invoice.period_start,
        current_period_end: invoice.period_end,
        trial_ends_at: null,
        cancel_at_period_end: false,
        updated_at: now,
      })
      .eq("id", invoice.tenant_id);
  }

  return NextResponse.json({ ok: true, matched: true, status });
}
