/**
 * Kenya Payroll Calculation Utilities — 2024 rates.
 *
 * References:
 *  - PAYE: KRA Income Tax Act
 *  - NHIF/SHIF: Social Health Insurance Fund (2.75% of gross — SHIF 2024)
 *  - NSSF: New NSSF Act 2013 — Tier I (6% up to KSh 7,000) + Tier II (6% from 7,001–36,000)
 *
 * ALL payroll functions live here — NOT in API route files.
 */

import type { PayrollResult } from "@/lib/types";

// ─── PAYE Tax Bands (monthly, 2024) ──────────────────────────────────────────
// Source: KRA — rates applicable from January 2023 onward
const PAYE_BANDS = [
  { limit: 24_000, rate: 0.10 },
  { limit: 8_333,  rate: 0.25 },
  { limit: 467_667, rate: 0.30 },
  { limit: Infinity, rate: 0.35 },
] as const;

const PERSONAL_RELIEF = 2_400; // KSh per month

/** Calculate PAYE (Pay As You Earn) for a given monthly taxable income. */
export function calculatePAYE(taxableIncome: number): {
  paye: number;
  bands: Array<{ band: string; taxable: number; rate: number; tax: number }>;
} {
  const bands: Array<{ band: string; taxable: number; rate: number; tax: number }> = [];
  let remaining = Math.max(0, taxableIncome);
  let grossTax = 0;

  const labels = [
    "0 – 24,000",
    "24,001 – 32,333",
    "32,334 – 500,000",
    "Over 500,000",
  ];

  for (let i = 0; i < PAYE_BANDS.length; i++) {
    if (remaining <= 0) break;
    const { limit, rate } = PAYE_BANDS[i];
    const taxable = Math.min(remaining, limit);
    const tax = taxable * rate;
    bands.push({ band: labels[i], taxable, rate, tax });
    grossTax += tax;
    remaining -= taxable;
  }

  const paye = Math.max(0, grossTax - PERSONAL_RELIEF);
  return { paye: round2(paye), bands };
}

// ─── NHIF / SHIF (Social Health Insurance Fund — 2024) ────────────────────────
// Effective Oct 2024: 2.75% of gross salary (SHIF replaces NHIF flat rates)

export function calculateNHIF(grossSalary: number): number {
  return round2(grossSalary * 0.0275);
}

// ─── NSSF (New NSSF Act 2013) ─────────────────────────────────────────────────
// Tier I:  6% on earnings up to KSh 7,000 (lower earnings limit)
// Tier II: 6% on earnings from KSh 7,001 to KSh 36,000 (upper earnings limit)

const NSSF_LOWER_LIMIT = 7_000;
const NSSF_UPPER_LIMIT = 36_000;
const NSSF_RATE = 0.06;

export function calculateNSSF(grossSalary: number): {
  tierI: number;
  tierII: number;
  total: number;
} {
  const tierIBase = Math.min(grossSalary, NSSF_LOWER_LIMIT);
  const tierI = round2(tierIBase * NSSF_RATE);

  const tierIIBase =
    grossSalary > NSSF_LOWER_LIMIT
      ? Math.min(grossSalary, NSSF_UPPER_LIMIT) - NSSF_LOWER_LIMIT
      : 0;
  const tierII = round2(tierIIBase * NSSF_RATE);

  return { tierI, tierII, total: round2(tierI + tierII) };
}

// ─── Full Payroll Calculation ─────────────────────────────────────────────────

/**
 * Calculate full monthly payroll for one employee.
 *
 * @param employeeId    Employee UUID
 * @param employeeName  Display name
 * @param basicSalary   Monthly basic salary in KSh
 * @param allowances    Additional allowances (housing, transport, etc.)
 */
export function calculatePayroll(
  employeeId: string,
  employeeName: string,
  basicSalary: number,
  allowances = 0
): PayrollResult {
  const grossSalary = round2(basicSalary + allowances);

  // NSSF deducted before PAYE calculation (reduces taxable income)
  const nssfResult = calculateNSSF(grossSalary);
  const nhif = calculateNHIF(grossSalary);

  // Taxable income = gross - NSSF employee contribution
  const taxableIncome = round2(grossSalary - nssfResult.total);

  const { paye, bands } = calculatePAYE(taxableIncome);

  const totalDeductions = round2(paye + nhif + nssfResult.total);
  const netPay = round2(grossSalary - totalDeductions);

  return {
    employeeId,
    employeeName,
    basicSalary,
    grossSalary,
    paye,
    nhif,
    nssf: nssfResult.total,
    totalDeductions,
    netPay,
    breakdown: {
      payeTaxBands: bands,
      nssfTierI: nssfResult.tierI,
      nssfTierII: nssfResult.tierII,
    },
  };
}

/**
 * Calculate payroll for multiple employees.
 */
export function calculatePayrollBatch(
  employees: Array<{
    id: string;
    full_name: string;
    basic_salary: number;
    allowances?: number;
  }>
): PayrollResult[] {
  return employees.map((emp) =>
    calculatePayroll(emp.id, emp.full_name, emp.basic_salary, emp.allowances ?? 0)
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Annual leave entitlement under Kenyan Employment Act.
 * Minimum 21 working days per year.
 */
export function annualLeaveEntitlement(_yearsOfService: number): number {
  return 21; // Kenya Employment Act minimum
}
