import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * PayHero webhook receiver — public endpoint.
 * Called by PayHero after an STK push / payout resolves.
 * Payload shape (simplified):
 *   {
 *     status: "Success" | "Failed" | "Cancelled",
 *     CheckoutRequestID: "ws_CO_...",
 *     external_reference: "INV-000123",
 *     MpesaReceiptNumber: "SKJ12ABCDEF",
 *     Amount: 1500,
 *     Phone: "2547...",
 *     ResultDesc: "..."
 *   }
 */
export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const requestId = payload.CheckoutRequestID ?? payload.checkout_request_id ?? payload.reference;
  const externalRef = payload.external_reference ?? payload.ExternalReference;

  // Find the transaction
  let tx: any = null;
  if (requestId) {
    const { data } = await db
      .from("payhero_transactions")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();
    tx = data;
  }
  if (!tx && externalRef) {
    const { data } = await db
      .from("payhero_transactions")
      .select("*")
      .eq("external_reference", externalRef)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    tx = data;
  }

  // Always log the raw event for audit — even if we can't match it
  await db.from("payhero_events").insert({
    tenant_id: tx?.tenant_id ?? null,
    transaction_id: tx?.id ?? null,
    event_type: payload.status ?? "unknown",
    payload,
  });

  if (!tx) return NextResponse.json({ ok: true, matched: false });

  const rawStatus = String(payload.status ?? payload.Status ?? "").toLowerCase();
  let status: "success" | "failed" | "cancelled" | "expired" | "pending" = "pending";
  if (rawStatus.includes("success") || rawStatus === "completed") status = "success";
  else if (rawStatus.includes("cancel")) status = "cancelled";
  else if (rawStatus.includes("fail") || rawStatus.includes("error")) status = "failed";
  else if (rawStatus.includes("expire") || rawStatus.includes("timeout")) status = "expired";

  const providerRef =
    payload.MpesaReceiptNumber ??
    payload.mpesa_receipt_number ??
    payload.TransactionReference ??
    null;

  await db
    .from("payhero_transactions")
    .update({
      status,
      provider_reference: providerRef,
      failure_reason: status === "success" ? null : (payload.ResultDesc ?? payload.failure_reason ?? null),
      completed_at: new Date().toISOString(),
    })
    .eq("id", tx.id);

  // If this collected for an invoice, auto-post a receipt
  if (status === "success" && tx.invoice_id && !tx.receipt_id) {
    const { data: inv } = await db
      .from("invoices")
      .select("id, invoice_number, customer_id, total, paid_amount, balance_due")
      .eq("id", tx.invoice_id)
      .single();

    if (inv) {
      const { data: numData } = await db.rpc("next_doc_number", {
        p_tenant_id: tx.tenant_id,
        p_doc_type: "receipt",
      });
      const receiptNumber = `RCT-${String(numData ?? 1).padStart(6, "0")}`;

      const { data: receipt } = await db
        .from("receipts")
        .insert({
          tenant_id: tx.tenant_id,
          receipt_number: receiptNumber,
          invoice_id: tx.invoice_id,
          customer_id: tx.customer_id ?? inv.customer_id,
          amount: tx.amount,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method: "mpesa",
          reference: providerRef,
          notes: `PayHero webhook • ${tx.external_reference}`,
        })
        .select()
        .single();

      if (receipt) {
        await db
          .from("payhero_transactions")
          .update({ receipt_id: receipt.id })
          .eq("id", tx.id);

        const newPaid = Number(inv.paid_amount ?? 0) + Number(tx.amount);
        const newBalance = Number(inv.total) - newPaid;
        await db
          .from("invoices")
          .update({
            paid_amount: newPaid,
            balance_due: Math.max(0, newBalance),
            status: newBalance <= 0.01 ? "paid" : "partial",
          })
          .eq("id", inv.id);
      }
    }
  }

  return NextResponse.json({ ok: true, matched: true, status });
}
