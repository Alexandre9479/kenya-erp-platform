import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ReportsClient } from "@/components/reports/reports-client";

export const metadata: Metadata = { title: "Reports & Analytics" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Business performance overview and financial summaries</p>
      </div>
      <ReportsClient />
    </div>
  );
}
