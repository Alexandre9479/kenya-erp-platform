import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/supabase";
import { HRClient } from "@/components/hr/hr-client";

export const metadata: Metadata = { title: "HR & Payroll" };

export default async function HRPage() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect("/login");
  }
  const tenantId = session.user.tenantId;

  const supabase = await createServiceClient();

  const { data: employees, count } = await supabase
    .from("employees")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("full_name", { ascending: true })
    .range(0, 24);

  return (
    <HRClient
      initialEmployees={(employees ?? []) as Tables<"employees">[]}
      totalCount={count ?? 0}
    />
  );
}
