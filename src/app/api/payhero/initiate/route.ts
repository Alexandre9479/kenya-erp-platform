import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { initiateStkPush, normalisePhone } from "@/lib/payhero/client";

const schema = z.object({
  amount: z.number().positive(),
  phone: z.string().min(9),
  external_reference: z.string().min(1),
  channel_id: z.string().optional(),
  invoice_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: cfg } = await db
    .from("payhero_config")
    .select("api_username, api_password, default_channel_id, enabled")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!cfg || !cfg.enabled || !cfg.api_username || !cfg.api_password) {
    return NextResponse.json({ error: "PayHero not configured for this tenant" }, { status: 400 });
  }

  const channel_id = parsed.data.channel_id ?? cfg.default_channel_id;
  if (!channel_id) return NextResponse.json({ error: "channel_id required" }, { status: 400 });

  const origin = new URL(req.url).origin;
  const callback_url = `${origin}/api/payhero/webhook`;

  // Pre-create the transaction row so the webhook has something to update
  const { data: tx, error: txErr } = await db
    .from("payhero_transactions")
    .insert({
      tenant_id: tenantId,
      direction: "collect",
      external_reference: parsed.data.external_reference,
      invoice_id: parsed.data.invoice_id ?? null,
      customer_id: parsed.data.customer_id ?? null,
      customer_phone: normalisePhone(parsed.data.phone),
      amount: parsed.data.amount,
      currency_code: "KES",
      channel_id,
      status: "pending",
      requested_by: session.user.id,
    })
    .select()
    .single();

  if (txErr || !tx) return NextResponse.json({ error: txErr?.message ?? "Failed" }, { status: 500 });

  try {
    const resp = await initiateStkPush(
      { api_username: cfg.api_username, api_password: cfg.api_password },
      {
        amount: parsed.data.amount,
        phone: parsed.data.phone,
        channel_id,
        external_reference: parsed.data.external_reference,
        callback_url,
        customer_name: parsed.data.customer_name,
      }
    );

    await db
      .from("payhero_transactions")
      .update({
        request_id: resp?.CheckoutRequestID ?? resp?.reference ?? null,
        raw_request: { amount: parsed.data.amount, phone: parsed.data.phone, channel_id },
        raw_response: resp,
      })
      .eq("id", tx.id);

    return NextResponse.json({ data: { id: tx.id, provider_response: resp } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PayHero request failed";
    await db
      .from("payhero_transactions")
      .update({ status: "failed", failure_reason: msg, completed_at: new Date().toISOString() })
      .eq("id", tx.id);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
