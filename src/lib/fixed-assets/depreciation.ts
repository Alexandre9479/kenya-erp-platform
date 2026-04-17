// Depreciation calculation helpers

export type Method = "straight_line" | "reducing_balance" | "none";

/** Monthly depreciation for one asset. */
export function monthlyDepreciation(params: {
  method: Method;
  acquisitionCost: number;
  salvageValue: number;
  accumulatedDepreciation: number;
  rate: number;                // % per year, e.g. 25 for 25%
  usefulLifeYears: number | null;
}): number {
  const { method, acquisitionCost, salvageValue, accumulatedDepreciation, rate, usefulLifeYears } = params;
  if (method === "none") return 0;

  const depreciable = Math.max(0, acquisitionCost - salvageValue);
  const nbv = acquisitionCost - accumulatedDepreciation;

  if (method === "straight_line") {
    if (usefulLifeYears && usefulLifeYears > 0) {
      const perMonth = depreciable / (usefulLifeYears * 12);
      const remaining = Math.max(0, nbv - salvageValue);
      return Math.min(perMonth, remaining);
    }
    if (rate > 0) {
      const perMonth = (depreciable * rate) / 100 / 12;
      const remaining = Math.max(0, nbv - salvageValue);
      return Math.min(perMonth, remaining);
    }
    return 0;
  }

  if (method === "reducing_balance") {
    if (rate <= 0) return 0;
    const perMonth = (nbv * rate) / 100 / 12;
    const remaining = Math.max(0, nbv - salvageValue);
    return Math.min(perMonth, remaining);
  }

  return 0;
}

export function generateSchedule(params: {
  method: Method;
  acquisitionCost: number;
  salvageValue: number;
  rate: number;
  usefulLifeYears: number | null;
  startDate: string;         // ISO date
  months?: number;           // default: 60
}): Array<{ month: number; year: number; opening: number; depreciation: number; closing: number }> {
  const months = params.months ?? 60;
  const start = new Date(params.startDate);
  let nbv = params.acquisitionCost;
  let accum = 0;
  const out = [];

  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const dep = monthlyDepreciation({
      method: params.method,
      acquisitionCost: params.acquisitionCost,
      salvageValue: params.salvageValue,
      accumulatedDepreciation: accum,
      rate: params.rate,
      usefulLifeYears: params.usefulLifeYears,
    });
    if (dep <= 0) break;
    const opening = nbv;
    nbv -= dep;
    accum += dep;
    out.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      opening,
      depreciation: dep,
      closing: nbv,
    });
  }
  return out;
}
