import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { monthlyDepreciation } from "@/lib/fixed-assets/depreciation";

// Run monthly depreciation for a given period across all active assets.
// Idempotent: uses UNIQUE(tenant, asset, year, month).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { period_year, period_month } = await req.json() as { period_year: number; period_month: number };
  if (!period_year || !period_month) {
    return NextResponse.json({ error: "period_year and period_month required" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: assets } = await db.from("fixed_assets")
    .select("id, acquisition_cost, acquisition_date, salvage_value, accumulated_depreciation, depreciation_method, depreciation_rate, useful_life_years, status")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (!assets || assets.length === 0) {
    return NextResponse.json({ data: { processed: 0, total: 0 } });
  }

  // Skip assets acquired after the period (can't depreciate before acquisition)
  const periodLastDay = new Date(period_year, period_month, 0).toISOString().slice(0, 10);

  let processed = 0;
  const now = new Date().toISOString();

  for (const asset of assets as any[]) {
    if (asset.acquisition_date > periodLastDay) continue;

    // Skip if already posted for this period
    const { data: existing } = await db
      .from("fixed_asset_depreciation")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("asset_id", asset.id)
      .eq("period_year", period_year)
      .eq("period_month", period_month)
      .maybeSingle();
    if (existing) continue;

    const dep = monthlyDepreciation({
      method: asset.depreciation_method,
      acquisitionCost: Number(asset.acquisition_cost),
      salvageValue: Number(asset.salvage_value),
      accumulatedDepreciation: Number(asset.accumulated_depreciation),
      rate: Number(asset.depreciation_rate),
      usefulLifeYears: asset.useful_life_years,
    });
    if (dep <= 0) continue;

    const opening = Number(asset.acquisition_cost) - Number(asset.accumulated_depreciation);
    const closing = opening - dep;

    await db.from("fixed_asset_depreciation").insert({
      tenant_id: tenantId,
      asset_id: asset.id,
      period_year,
      period_month,
      opening_nbv: opening,
      depreciation: dep,
      closing_nbv: closing,
      posted_at: now,
      posted_by: session.user.id,
    });

    await db.from("fixed_assets")
      .update({
        accumulated_depreciation: Number(asset.accumulated_depreciation) + dep,
        updated_at: now,
      })
      .eq("id", asset.id);

    processed++;
  }

  return NextResponse.json({ data: { processed, total: assets.length, period_year, period_month } });
}
