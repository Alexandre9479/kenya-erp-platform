import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { UsersClient } from "@/components/users/users-client";

export const metadata: Metadata = { title: "User Management" };

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Only tenant_admin and super_admin can access this page
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    redirect("/dashboard");
  }

  if (!session.user.tenantId) {
    redirect("/dashboard");
  }

  const supabase = await createServiceClient();

  const { data: users, count } = await supabase
    .from("users")
    .select(
      "id, tenant_id, email, full_name, role, is_active, phone, avatar_url, last_login_at, created_at, updated_at",
      { count: "exact" }
    )
    .eq("tenant_id", session.user.tenantId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(0, 24);

  return (
    <UsersClient
      initialData={users ?? []}
      totalCount={count ?? 0}
      currentUserId={session.user.id}
    />
  );
}
