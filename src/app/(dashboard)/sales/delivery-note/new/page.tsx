import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DeliveryNoteBuilder } from "@/components/sales/delivery-note-builder";

export const metadata: Metadata = { title: "New Delivery Note" };

export default async function NewDeliveryNotePage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  return (
    <div className="space-y-6">
      <DeliveryNoteBuilder />
    </div>
  );
}
