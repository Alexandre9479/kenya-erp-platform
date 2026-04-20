import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: boolean
        ) => {
          order: (
            c: string,
            o: { ascending: boolean }
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };

  const { data, error } = await db
    .from("subscription_plans")
    .select(
      "id, code, name, description, price_monthly, price_annual, currency_code, trial_days, max_users, max_invoices_per_mo, features, is_public, is_active, sort_order"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
