import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

function addInterval(date: Date, freq: string, count: number): Date {
  const d = new Date(date);
  switch (freq) {
    case "daily": d.setDate(d.getDate() + count); break;
    case "weekly": d.setDate(d.getDate() + count * 7); break;
    case "monthly": d.setMonth(d.getMonth() + count); break;
    case "quarterly": d.setMonth(d.getMonth() + count * 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + count); break;
  }
  return d;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    const key = req.headers.get("x-cron-key");
    if (!key || key !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const tenantFilter = session?.user?.tenantId ?? null;

  const supabase = await createServiceClient();
  const db = supabase as any;
  const today = new Date().toISOString().slice(0, 10);

  let q = db
    .from("recurring_invoice_templates")
    .select("*")
    .eq("status", "active")
    .lte("next_run_date", today);
  if (tenantFilter) q = q.eq("tenant_id", tenantFilter);

  const { data: templates, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ template_id: string; status: string; invoice_id?: string; error?: string }> = [];

  for (const tpl of templates ?? []) {
    try {
      const { data: items } = await db
        .from("recurring_invoice_items")
        .select("*")
        .eq("template_id", tpl.id);

      if (!items || items.length === 0) {
        await db.from("recurring_invoice_runs").insert({
          tenant_id: tpl.tenant_id, template_id: tpl.id, run_date: today,
          status: "skipped", error: "No items",
        });
        results.push({ template_id: tpl.id, status: "skipped", error: "No items" });
        continue;
      }

      let subtotal = 0;
      let tax_amount = 0;
      const invItems = items.map((i: any, idx: number) => {
        const lineSub = Number(i.quantity) * Number(i.unit_price) * (1 - Number(i.discount_pct) / 100);
        const vat = Math.round(lineSub * (Number(i.tax_rate) / 100) * 100) / 100;
        subtotal += lineSub;
        tax_amount += vat;
        return {
          product_id: i.product_id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          vat_rate: i.tax_rate,
          vat_amount: vat,
          line_total: lineSub + vat,
          sort_order: idx,
        };
      });
      const total_amount = subtotal + tax_amount;

      const { data: docNum } = await db.rpc("next_doc_number", {
        p_tenant_id: tpl.tenant_id,
        p_doc_type: "invoice",
      });
      const { data: tenant } = await db.from("tenants").select("invoice_prefix").eq("id", tpl.tenant_id).single();
      const prefix = tenant?.invoice_prefix ?? "INV";
      const invoice_number = `${prefix}-${String(docNum ?? Date.now()).padStart(5, "0")}`;

      const issue_date = today;
      const due_date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const { data: inv, error: invErr } = await db
        .from("invoices")
        .insert({
          tenant_id: tpl.tenant_id,
          invoice_number,
          customer_id: tpl.customer_id,
          issue_date,
          due_date,
          status: "sent",
          subtotal,
          tax_amount,
          discount_amount: 0,
          total_amount,
          amount_paid: 0,
          currency_code: tpl.currency_code,
          notes: tpl.notes,
          terms: tpl.payment_terms,
        })
        .select()
        .single();

      if (invErr || !inv) throw new Error(invErr?.message ?? "Invoice creation failed");

      const lineRows = invItems.map((i: any) => ({ ...i, tenant_id: tpl.tenant_id, invoice_id: inv.id }));
      await db.from("invoice_items").insert(lineRows);

      const nextRun = addInterval(new Date(tpl.next_run_date), tpl.frequency, tpl.interval_count);
      const runsCompleted = (tpl.runs_completed ?? 0) + 1;
      const endReached = tpl.end_date && nextRun > new Date(tpl.end_date);
      const maxReached = tpl.max_runs && runsCompleted >= tpl.max_runs;

      await db.from("recurring_invoice_templates").update({
        last_run_date: today,
        next_run_date: nextRun.toISOString().slice(0, 10),
        runs_completed: runsCompleted,
        status: endReached || maxReached ? "completed" : "active",
        updated_at: new Date().toISOString(),
      }).eq("id", tpl.id);

      await db.from("recurring_invoice_runs").insert({
        tenant_id: tpl.tenant_id, template_id: tpl.id, invoice_id: inv.id,
        run_date: today, status: "success",
      });

      results.push({ template_id: tpl.id, status: "success", invoice_id: inv.id });
    } catch (e: any) {
      await db.from("recurring_invoice_runs").insert({
        tenant_id: tpl.tenant_id, template_id: tpl.id, run_date: today,
        status: "failed", error: e.message ?? String(e),
      });
      results.push({ template_id: tpl.id, status: "failed", error: e.message ?? String(e) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
