import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PayslipView } from "@/components/hr/payslip-view";

export const metadata: Metadata = { title: "Payslip" };

export default async function PayslipPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const { employeeId } = await params;
  const sp = await searchParams;
  const now = new Date();
  const month = parseInt(sp.month ?? String(now.getMonth() + 1), 10);
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10);

  return <PayslipView employeeId={employeeId} month={month} year={year} />;
}
