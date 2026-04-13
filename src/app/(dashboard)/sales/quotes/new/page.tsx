import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { QuoteBuilder } from "@/components/sales/quote-builder";

export const metadata: Metadata = { title: "New Quotation" };

export default async function NewQuotePage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  return (
    <div className="space-y-6">
      <QuoteBuilder />
    </div>
  );
}
