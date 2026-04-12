import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/supabase";
import { CustomersClient } from "@/components/crm/customers-client";

export const metadata: Metadata = { title: "CRM" };

export default async function CRMPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const tenantId = (
    session.user as typeof session.user & { tenantId: string | null }
  ).tenantId;

  if (!tenantId) {
    redirect("/login");
  }

  const supabase = await createServiceClient();

  const { data, count } = await supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .range(0, 24);

  const initialData: Tables<"customers">[] = data ?? [];
  const totalCount: number = count ?? 0;

  return (
    <CustomersClient initialData={initialData} totalCount={totalCount} />
  );
}
