import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const unreadOnly = searchParams.get("unread") === "true";

  const supabase = await createServiceClient();
  const db = supabase as any;

  let query = db
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also get unread count
  const { count: unreadCount } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq("is_read", false);

  return NextResponse.json({ data: data ?? [], count: count ?? 0, unreadCount: unreadCount ?? 0 });
}

// Mark notifications as read
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const ids: string[] = body.ids;
  const supabase = await createServiceClient();
  const db = supabase as any;
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  if (ids && ids.length > 0) {
    const { error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("tenant_id", tenantId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Mark all as read
    const { error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("tenant_id", tenantId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq("is_read", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
