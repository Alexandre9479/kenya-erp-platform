import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CustomerStatement } from "@/components/sales/customer-statement";

export const metadata: Metadata = { title: "Customer Statement" };

export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const { id } = await params;

  return <CustomerStatement customerId={id} />;
}
