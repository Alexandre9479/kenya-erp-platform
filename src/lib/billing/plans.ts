// Billing helpers — plan lookup, period math, PayHero platform credentials.

export type BillingCycle = "monthly" | "annual";

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_annual: number;
  currency_code: string;
  trial_days: number;
  max_users: number | null;
  max_invoices_per_mo: number | null;
  features: string[];
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
};

export function priceFor(plan: PlanRow, cycle: BillingCycle): number {
  return cycle === "annual" ? Number(plan.price_annual) : Number(plan.price_monthly);
}

export function periodEnd(start: Date, cycle: BillingCycle): Date {
  const d = new Date(start);
  if (cycle === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

export function platformPayHeroCreds(): {
  api_username: string;
  api_password: string;
  channel_id: string;
} | null {
  const api_username = process.env.PAYHERO_PLATFORM_USERNAME;
  const api_password = process.env.PAYHERO_PLATFORM_PASSWORD;
  const channel_id = process.env.PAYHERO_PLATFORM_CHANNEL_ID;
  if (!api_username || !api_password || !channel_id) return null;
  return { api_username, api_password, channel_id };
}
