import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppsLauncher } from "@/components/apps/apps-launcher";

export const metadata: Metadata = { title: "Apps" };

export default async function AppsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  return (
    <AppsLauncher
      userName={session.user.name ?? "there"}
      tenantName={session.user.tenantName ?? "your business"}
    />
  );
}
