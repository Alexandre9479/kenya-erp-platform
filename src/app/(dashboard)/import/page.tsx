export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ImportClient } from "@/components/import/import-client";

export default async function ImportPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.tenantId) redirect("/signin");
  if (role !== "tenant_admin" && role !== "super_admin" && role !== "accountant") {
    redirect("/apps");
  }
  return <ImportClient />;
}
