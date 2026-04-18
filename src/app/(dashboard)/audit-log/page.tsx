import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { AuditLogClient } from "@/components/audit-log/audit-log-client";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data } = await db
    .from("activity_log")
    .select("*, users(name, email)")
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: false })
    .limit(500);

  return <AuditLogClient rows={data ?? []} />;
}
