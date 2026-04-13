import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreditNoteBuilder } from "@/components/sales/credit-note-builder";

export const metadata: Metadata = { title: "New Credit Note" };

export default async function NewCreditNotePage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  return (
    <div className="space-y-6">
      <CreditNoteBuilder />
    </div>
  );
}
