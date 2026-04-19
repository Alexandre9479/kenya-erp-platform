import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";

export const metadata: Metadata = { title: "Setup workspace" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  if (
    session.user.role !== "tenant_admin" &&
    session.user.role !== "super_admin"
  ) {
    redirect("/apps");
  }

  const supabase = await createServiceClient();
  const db = supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: unknown; error: unknown }>;
          order?: (
            col: string,
            opts: { ascending: boolean }
          ) => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  };

  const tenantResult = await db
    .from("tenants")
    .select(
      "id, name, email, phone, address, city, country, kra_pin, logo_url, primary_color, currency, timezone, bank_name, bank_account, bank_branch, invoice_prefix, quote_prefix, lpo_prefix, receipt_prefix, grn_prefix, onboarding_completed, onboarding_step, onboarding_skipped"
    )
    .eq("id", session.user.tenantId)
    .single();

  const tenant = tenantResult.data as
    | {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        address: string | null;
        city: string | null;
        country: string;
        kra_pin: string | null;
        logo_url: string | null;
        primary_color: string;
        currency: string;
        timezone: string;
        bank_name: string | null;
        bank_account: string | null;
        bank_branch: string | null;
        invoice_prefix: string;
        quote_prefix: string;
        lpo_prefix: string;
        receipt_prefix: string | null;
        grn_prefix: string;
        onboarding_completed: boolean;
        onboarding_step: number;
        onboarding_skipped: boolean;
      }
    | null;

  if (!tenant) redirect("/login");

  if (tenant.onboarding_completed) {
    redirect("/apps");
  }

  const warehousesRes = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, v: string) => {
          order: (c: string, o: { ascending: boolean }) => Promise<{
            data: unknown;
          }>;
        };
      };
    };
  })
    .from("warehouses")
    .select("id, name, location, is_default, is_active")
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: true });

  const warehouses =
    (warehousesRes.data as Array<{
      id: string;
      name: string;
      location: string | null;
      is_default: boolean;
      is_active: boolean;
    }>) ?? [];

  return <OnboardingClient tenant={tenant} initialWarehouses={warehouses} />;
}
