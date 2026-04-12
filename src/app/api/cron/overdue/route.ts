import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Cron job: mark past-due invoices as overdue.
 * Scheduled daily at 01:00 UTC in vercel.json.
 * Protected by CRON_SECRET env var.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "overdue" } as { status: "overdue" })
    .in("status", ["sent", "partial"])
    .lt("due_date", today)
    .select("id, invoice_number, tenant_id");

  if (error) {
    console.error("[cron/overdue]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = data?.length ?? 0;
  console.info(`[cron/overdue] Marked ${count} invoice(s) as overdue`);
  return NextResponse.json({ ok: true, updated: count });
}
