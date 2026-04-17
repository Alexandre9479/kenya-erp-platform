import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { SupplierReconClient } from "@/components/supplier-recon/supplier-recon-client";

export const metadata: Metadata = { title: "Supplier Reconciliation" };

export default async function SupplierReconPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const [{ data: suppliers }, { data: statements }] = await Promise.all([
    db.from("suppliers")
      .select("id, name, phone, email")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name"),
    db.from("supplier_statements")
      .select("*, suppliers(name)")
      .eq("tenant_id", tenantId)
      .order("statement_date", { ascending: false })
      .range(0, 49),
  ]);

  return (
    <SupplierReconClient
      initialSuppliers={suppliers ?? []}
      initialStatements={statements ?? []}
    />
  );
}
