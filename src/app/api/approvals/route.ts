import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  doc_type: z.enum([
    "expense", "purchase_order", "journal_entry",
    "leave_request", "timesheet", "credit_note",
    "payout", "other",
  ]),
  doc_id: z.string().uuid(),
  doc_reference: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  currency_code: z.string().length(3).optional().default("KES"),
  approver_role: z.string().optional().nullable(),
  approver_user_id: z.string().uuid().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const docType = searchParams.get("doc_type");
  const mine = searchParams.get("mine") === "1";

  const supabase = await createServiceClient();
  const db = supabase as any;

  let q = db
    .from("approval_requests")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .order("requested_at", { ascending: false })
    .limit(500);

  if (status) q = q.eq("status", status);
  if (docType) q = q.eq("doc_type", docType);
  if (mine) {
    const role = session.user.role;
    const uid = session.user.id;
    q = q.or(`approver_user_id.eq.${uid},approver_role.eq.${role}`);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  // Attempt to auto-resolve rule: first active rule for doc_type where amount in range, lowest priority
  let ruleId: string | null = null;
  let approverRole = parsed.data.approver_role ?? null;
  let approverUserId = parsed.data.approver_user_id ?? null;

  if (!approverRole && !approverUserId) {
    const amt = Number(parsed.data.amount ?? 0);
    const { data: rules } = await db
      .from("approval_rules")
      .select("*")
      .eq("tenant_id", session.user.tenantId)
      .eq("doc_type", parsed.data.doc_type)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    const match = (rules ?? []).find((r: any) =>
      amt >= Number(r.min_amount ?? 0) &&
      (r.max_amount == null || amt <= Number(r.max_amount))
    );
    if (match) {
      ruleId = match.id;
      approverRole = match.approver_role;
      approverUserId = match.approver_user_id;
    }
  }

  const { data, error } = await db
    .from("approval_requests")
    .insert({
      tenant_id: session.user.tenantId,
      doc_type: parsed.data.doc_type,
      doc_id: parsed.data.doc_id,
      doc_reference: parsed.data.doc_reference,
      amount: parsed.data.amount,
      currency_code: parsed.data.currency_code,
      requested_by: session.user.id,
      rule_id: ruleId,
      approver_role: approverRole,
      approver_user_id: approverUserId,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
