import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: dn, error } = await db
    .from("delivery_notes")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !dn) return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });

  const { data: items } = await db.from("delivery_note_items").select("*").eq("delivery_note_id", id).order("sort_order");

  return NextResponse.json({ data: { ...dn, items: items ?? [] } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const body = await req.json();

  const supabase = await createServiceClient();
  const db = supabase as any;

  const allowed = ["status", "driver_name", "vehicle_reg", "notes", "received_by"];
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (body.status === "delivered") {
    updates.received_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from("delivery_notes")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: dn } = await db.from("delivery_notes").select("status").eq("id", id).eq("tenant_id", tenantId).single();
  if (!dn) return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
  if (dn.status !== "pending") return NextResponse.json({ error: "Only pending delivery notes can be deleted" }, { status: 400 });

  await db.from("delivery_note_items").delete().eq("delivery_note_id", id);
  const { error } = await db.from("delivery_notes").delete().eq("id", id).eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
