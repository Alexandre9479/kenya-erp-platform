import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const openSchema = z.object({
  opening_float: z.number().min(0).default(0),
  warehouse_id: z.string().uuid().optional().nullable(),
  register_name: z.string().optional().default("Main Till"),
});

const closeSchema = z.object({
  id: z.string().uuid(),
  closing_cash: z.number().min(0),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const supabase = await createServiceClient();
  const db = supabase as any;

  let q = db
    .from("pos_sessions")
    .select("*, warehouses(name)")
    .eq("tenant_id", session.user.tenantId)
    .order("opened_at", { ascending: false })
    .limit(100);

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = openSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: numData } = await db.rpc("next_doc_number", {
    p_tenant_id: session.user.tenantId,
    p_doc_type: "pos_session",
  });
  const sessionNumber = `POS-${String(numData ?? 1).padStart(6, "0")}`;

  const { data, error } = await db
    .from("pos_sessions")
    .insert({
      tenant_id: session.user.tenantId,
      session_number: sessionNumber,
      cashier_id: session.user.id,
      status: "open",
      ...parsed.data,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// Close a session — PATCH /api/pos/sessions
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = closeSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: sessionRow } = await db
    .from("pos_sessions")
    .select("opening_float, id")
    .eq("id", parsed.data.id)
    .eq("tenant_id", session.user.tenantId)
    .single();

  if (!sessionRow) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data: cashPayments } = await db
    .from("pos_order_payments")
    .select("amount")
    .eq("tenant_id", session.user.tenantId)
    .eq("payment_method", "cash")
    .in(
      "order_id",
      (
        await db.from("pos_orders").select("id").eq("session_id", parsed.data.id)
      ).data?.map((o: any) => o.id) ?? []
    );

  const cashTaken = (cashPayments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const expected = Number(sessionRow.opening_float ?? 0) + cashTaken;
  const variance = parsed.data.closing_cash - expected;

  const { data, error } = await db
    .from("pos_sessions")
    .update({
      status: "closed",
      closing_cash: parsed.data.closing_cash,
      expected_cash: expected,
      variance,
      closed_at: new Date().toISOString(),
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("tenant_id", session.user.tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
