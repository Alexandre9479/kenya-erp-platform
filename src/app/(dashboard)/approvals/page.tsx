import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ApprovalsClient } from "@/components/approvals/approvals-client";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data } = await db
    .from("approval_requests")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .order("requested_at", { ascending: false })
    .limit(200);

  return (
    <ApprovalsClient
      initial={data ?? []}
      currentUserId={session.user.id ?? ""}
      currentRole={session.user.role ?? "viewer"}
    />
  );
}
