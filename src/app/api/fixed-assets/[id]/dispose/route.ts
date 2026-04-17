import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { disposal_date, disposal_amount, disposal_notes, status } = await req.json() as {
    disposal_date: string;
    disposal_amount: number;
    disposal_notes?: string;
    status?: "disposed" | "written_off" | "lost";
  };

  const supabase = await createServiceClient();
  const db = supabase as any;
  const { data, error } = await db.from("fixed_assets").update({
    status: status ?? "disposed",
    disposal_date,
    disposal_amount,
    disposal_notes: disposal_notes ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("tenant_id", session.user.tenantId).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
