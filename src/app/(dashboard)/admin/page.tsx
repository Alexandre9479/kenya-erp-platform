import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { AdminClient } from "@/components/admin/admin-client";

export const metadata: Metadata = { title: "Super Admin" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "super_admin") redirect("/dashboard");

  const supabase = await createServiceClient();

  const [tenantsResult, statsResult] = await Promise.all([
    supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, 24),
    supabase.from("tenants").select("id, is_active, subscription_status"),
  ]);

  const allTenants = statsResult.data ?? [];
  const stats = {
    total: allTenants.length,
    active: allTenants.filter((t) => t.is_active).length,
    trial: allTenants.filter((t) => t.subscription_status === "trial").length,
    inactive: allTenants.filter((t) => !t.is_active).length,
  };

  // Get user counts for first page
  const tenantIds = (tenantsResult.data ?? []).map((t) => t.id);
  let userCounts: Record<string, number> = {};
  if (tenantIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .eq("is_active", true);
    (users ?? []).forEach((u) => {
      if (u.tenant_id) userCounts[u.tenant_id] = (userCounts[u.tenant_id] ?? 0) + 1;
    });
  }

  const initialTenants = (tenantsResult.data ?? []).map((t) => ({
    ...t,
    user_count: userCounts[t.id] ?? 0,
  }));

  return (
    <AdminClient
      initialTenants={initialTenants}
      totalCount={allTenants.length}
      stats={stats}
    />
  );
}
