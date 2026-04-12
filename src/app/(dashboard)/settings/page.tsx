import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user || !session.user.tenantId) {
    redirect("/login");
  }

  const supabase = await createServiceClient();

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", session.user.tenantId)
    .single();

  if (error || !tenant) {
    redirect("/dashboard");
  }

  return <SettingsForm tenant={tenant} />;
}
