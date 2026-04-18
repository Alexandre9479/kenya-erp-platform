import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ProjectsClient } from "@/components/projects/projects-client";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const supabase = await createServiceClient();
  const db = supabase as any;

  const [projRes, custRes, tsRes, empRes] = await Promise.all([
    db.from("projects").select("*, customers(name)")
      .eq("tenant_id", session.user.tenantId).order("created_at", { ascending: false }),
    db.from("customers").select("id, name")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("name"),
    db.from("timesheets").select("*, projects(name, code), employees(first_name, last_name)")
      .eq("tenant_id", session.user.tenantId).order("work_date", { ascending: false }).limit(100),
    db.from("employees").select("id, first_name, last_name")
      .eq("tenant_id", session.user.tenantId).order("first_name"),
  ]);

  return (
    <ProjectsClient
      projects={projRes.data ?? []}
      customers={custRes.data ?? []}
      timesheets={tsRes.data ?? []}
      employees={empRes.data ?? []}
    />
  );
}
