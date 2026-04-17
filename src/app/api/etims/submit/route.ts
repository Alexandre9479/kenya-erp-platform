import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { submitToEtims, type EtimsConfig, type EtimsInvoicePayload } from "@/lib/etims/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoice_id } = await req.json();
  if (!invoice_id) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const [{ data: config }, { data: invoice }] = await Promise.all([
    db.from("etims_config").select("*").eq("tenant_id", tenantId).maybeSingle(),
    db.from("invoices")
      .select("*, customers(name, kra_pin, email), invoice_items(*)")
      .eq("id", invoice_id).eq("tenant_id", tenantId).single(),
  ]);

  if (!config || !config.is_active) {
    return NextResponse.json({ error: "eTIMS not configured or disabled" }, { status: 400 });
  }
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Build payload
  const payload: EtimsInvoicePayload = {
    document_type: "invoice",
    document_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    customer_pin: invoice.customers?.kra_pin ?? null,
    customer_name: invoice.customers?.name ?? null,
    subtotal: Number(invoice.subtotal),
    vat_amount: Number(invoice.tax_amount),
    total_amount: Number(invoice.total_amount),
    items: (invoice.invoice_items ?? []).map((it: any) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      vat_rate: Number(it.vat_rate),
      vat_amount: Number(it.vat_amount),
      line_total: Number(it.line_total),
    })),
  };

  // Create or find submission record
  let submissionId: string;
  const { data: existing } = await db.from("etims_submissions").select("id, attempt_count")
    .eq("tenant_id", tenantId).eq("document_type", "invoice").eq("document_number", invoice.invoice_number)
    .maybeSingle();

  if (existing) {
    submissionId = existing.id;
    await db.from("etims_submissions").update({
      status: "pending",
      attempt_count: (existing.attempt_count ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", submissionId);
  } else {
    const { data: ins } = await db.from("etims_submissions").insert({
      tenant_id: tenantId,
      document_type: "invoice",
      invoice_id: invoice.id,
      document_number: invoice.invoice_number,
      status: "pending",
      attempt_count: 1,
      last_attempt_at: new Date().toISOString(),
      payload: payload as any,
      created_by: session.user.id,
    }).select().single();
    submissionId = ins.id;
  }

  // Log outgoing
  await db.from("etims_logs").insert({
    tenant_id: tenantId,
    submission_id: submissionId,
    direction: "outgoing",
    url: config.endpoint_url,
    body: payload as any,
  });

  // Call KRA
  const etimsConfig: EtimsConfig = {
    environment: config.environment,
    device_type: config.device_type,
    endpoint_url: config.endpoint_url,
    device_serial: config.device_serial,
    kra_pin: config.kra_pin,
    branch_id: config.branch_id,
    api_key: config.api_key,
  };
  const result = await submitToEtims(etimsConfig, payload);

  // Log incoming
  await db.from("etims_logs").insert({
    tenant_id: tenantId,
    submission_id: submissionId,
    direction: "incoming",
    body: result.raw ?? result,
  });

  await db.from("etims_submissions").update({
    status: result.ok ? "accepted" : "failed",
    submitted_at: result.ok ? new Date().toISOString() : null,
    kra_invoice_no: result.kra_invoice_no ?? null,
    kra_signature: result.kra_signature ?? null,
    kra_internal_data: result.kra_internal_data ?? null,
    kra_qr_code: result.kra_qr_code ?? null,
    kra_timestamp: result.kra_timestamp ?? null,
    error_code: result.error_code ?? null,
    error_message: result.error_message ?? null,
    response: result.raw ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", submissionId);

  return NextResponse.json({ data: { submission_id: submissionId, ...result } });
}
