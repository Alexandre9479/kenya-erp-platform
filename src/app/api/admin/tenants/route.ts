import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  let query = supabase
    .from("tenants")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
  }
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  if (status === "trial") query = query.eq("subscription_status", "trial");

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user counts per tenant
  const tenantIds = (data ?? []).map((t) => t.id);
  let userCounts: Record<string, number> = {};
  if (tenantIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .eq("is_active", true);
    (users ?? []).forEach((u) => {
      if (u.tenant_id) {
        userCounts[u.tenant_id] = (userCounts[u.tenant_id] ?? 0) + 1;
      }
    });
  }

  const enriched = (data ?? []).map((t) => ({
    ...t,
    user_count: userCounts[t.id] ?? 0,
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });

  const body = await req.json();
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("tenants")
    .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
