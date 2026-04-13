import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const supabase = await createServiceClient();
  const db = supabase as any;

  // 1. Load the quote
  const { data: quote, error: qErr } = await db
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (qErr || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  if (quote.status === "converted") {
    return NextResponse.json({ error: "Quote has already been converted to an invoice" }, { status: 400 });
  }
  if (quote.status === "rejected" || quote.status === "expired") {
    return NextResponse.json({ error: `Cannot convert a ${quote.status} quote` }, { status: 400 });
  }

  // 2. Load quote items
  const { data: items } = await db.from("quote_items").select("*").eq("quote_id", id).order("sort_order");

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Quote has no line items" }, { status: 400 });
  }

  // 3. Generate invoice number
  const { data: docNum } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "invoice",
  });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("invoice_prefix")
    .eq("id", tenantId)
    .single();

  const prefix = tenant?.invoice_prefix ?? "INV";
  const invoice_number = `${prefix}-${String(docNum ?? Date.now()).padStart(5, "0")}`;

  // 4. Create the invoice (due date = 30 days from today)
  const today = new Date().toISOString().split("T")[0];
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const due_date = dueDate.toISOString().split("T")[0];

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      tenant_id: tenantId,
      invoice_number,
      customer_id: quote.customer_id,
      issue_date: today,
      due_date,
      status: "draft",
      subtotal: quote.subtotal,
      tax_amount: quote.tax_amount,
      discount_amount: quote.discount_amount,
      total_amount: quote.total_amount,
      amount_paid: 0,
      notes: quote.notes,
      terms: quote.terms,
      created_by: userId,
    })
    .select()
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  // 5. Copy line items
  const invoiceItems = items.map((item: any) => ({
    tenant_id: tenantId,
    invoice_id: invoice.id,
    product_id: item.product_id ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    vat_amount: item.vat_amount,
    line_total: item.line_total,
    sort_order: item.sort_order,
  }));

  const { error: liErr } = await supabase.from("invoice_items").insert(invoiceItems);
  if (liErr) {
    // Rollback invoice
    await supabase.from("invoices").delete().eq("id", invoice.id);
    return NextResponse.json({ error: liErr.message }, { status: 500 });
  }

  // 6. Mark quote as converted
  await db
    .from("quotes")
    .update({ status: "converted", converted_invoice_id: invoice.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({
    data: { invoice_id: invoice.id, invoice_number },
    message: `Quote converted to invoice ${invoice_number}`,
  });
}
