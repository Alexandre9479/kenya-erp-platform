import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { InvoiceBuilder } from "@/components/sales/invoice-builder";

export const metadata: Metadata = { title: "New Invoice" };

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  return (
    <div className="space-y-6">
      <InvoiceBuilder />
    </div>
  );
}
