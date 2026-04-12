import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LPOBuilder } from "@/components/purchasing/lpo-builder";

export const metadata: Metadata = { title: "New LPO" };

export default async function NewLPOPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  return (
    <div className="space-y-6">
      <LPOBuilder />
    </div>
  );
}
