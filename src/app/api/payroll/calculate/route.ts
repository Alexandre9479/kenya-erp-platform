import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// ─── Request Schema ───────────────────────────────────────────────────────────

const calculateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

// ─── Kenya 2024 Payroll Calculations ─────────────────────────────────────────

/**
 * Round to 2 decimal places.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * PAYE (Pay As You Earn) — KRA 2024 monthly bands.
 *
 * Band 1:  0 – 24,000        @ 10%
 * Band 2:  24,001 – 32,333   @ 25%  (width = 8,333)
 * Band 3:  32,334 – 500,000  @ 30%  (width = 467,667)
 * Band 4:  500,001 – 800,000 @ 32.5% (width = 299,999 — not in 5-band spec below)
 * Band 5:  > 800,000         @ 35%
 *
 * Per prompt spec: 500,001–800,000 @ 32.5%; above 800,000 @ 35%
 * Personal relief: KES 2,400/month
 */
function calculatePAYE(taxableIncome: number): number {
  const BANDS = [
    { width: 24_000,   rate: 0.10 },
    { width: 8_333,    rate: 0.25 },   // 24,001 – 32,333
    { width: 467_667,  rate: 0.30 },   // 32,334 – 500,000
    { width: 300_000,  rate: 0.325 },  // 500,001 – 800,000
    { width: Infinity, rate: 0.35 },   // > 800,000
  ];
  const PERSONAL_RELIEF = 2_400;

  let remaining = Math.max(0, taxableIncome);
  let grossTax = 0;

  for (const { width, rate } of BANDS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, width);
    grossTax += taxable * rate;
    remaining -= taxable;
  }

  return round2(Math.max(0, grossTax - PERSONAL_RELIEF));
}

/**
 * SHIF/NHIF 2024 — 2.75% of gross salary.
 */
function calculateNHIF(grossSalary: number): number {
  return round2(grossSalary * 0.0275);
}

/**
 * NSSF (New NSSF Act 2013).
 * Tier I:  6% on earnings up to KES 7,000 (max KES 420)
 * Tier II: 6% on earnings from KES 7,001 to KES 36,000 (max KES 1,740)
 * Both employee and employer contribute equally.
 */
function calculateNSSF(grossSalary: number): {
  employee: number;
  employer: number;
} {
  const LOWER_LIMIT = 7_000;
  const UPPER_LIMIT = 36_000;
  const RATE = 0.06;

  const tierIBase = Math.min(grossSalary, LOWER_LIMIT);
  const tierI = round2(tierIBase * RATE);

  const tierIIBase =
    grossSalary > LOWER_LIMIT
      ? Math.min(grossSalary, UPPER_LIMIT) - LOWER_LIMIT
      : 0;
  const tierII = round2(tierIIBase * RATE);

  const total = round2(tierI + tierII);

  // Employee and employer both contribute same total (statutory)
  return { employee: total, employer: total };
}

// ─── Payroll Line Item Type ───────────────────────────────────────────────────

export interface PayrollLineItem {
  employee_id: string;
  employee_number: string;
  full_name: string;
  department: string | null;
  employment_type: string;
  basic_salary: number;
  gross: number;
  paye: number;
  nhif: number;
  nssf_employee: number;
  nssf_employer: number;
  total_deductions: number;
  net_pay: number;
}

export interface PayrollSummary {
  month: number;
  year: number;
  employee_count: number;
  total_gross: number;
  total_paye: number;
  total_nhif: number;
  total_nssf_employee: number;
  total_nssf_employer: number;
  total_net_pay: number;
  lines: PayrollLineItem[];
}

// ─── POST /api/payroll/calculate ─────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = calculateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { month, year } = parsed.data;

  const supabase = await createServiceClient();

  // Fetch all active employees for this tenant
  const { data: employees, error } = await supabase
    .from("employees")
    .select(
      "id, employee_number, full_name, department, employment_type, basic_salary"
    )
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!employees || employees.length === 0) {
    return NextResponse.json({
      data: {
        month,
        year,
        employee_count: 0,
        total_gross: 0,
        total_paye: 0,
        total_nhif: 0,
        total_nssf_employee: 0,
        total_nssf_employer: 0,
        total_net_pay: 0,
        lines: [],
      } satisfies PayrollSummary,
    });
  }

  // Calculate payroll for each employee
  const lines: PayrollLineItem[] = employees.map((emp) => {
    const gross = round2(emp.basic_salary); // basic salary = gross (no allowances in schema)
    const nhif = calculateNHIF(gross);
    const nssf = calculateNSSF(gross);

    // NSSF employee contribution reduces taxable income for PAYE
    const taxableIncome = round2(gross - nssf.employee);
    const paye = calculatePAYE(taxableIncome);

    const totalDeductions = round2(paye + nhif + nssf.employee);
    const netPay = round2(gross - totalDeductions);

    return {
      employee_id: emp.id,
      employee_number: emp.employee_number,
      full_name: emp.full_name,
      department: emp.department,
      employment_type: emp.employment_type,
      basic_salary: emp.basic_salary,
      gross,
      paye,
      nhif,
      nssf_employee: nssf.employee,
      nssf_employer: nssf.employer,
      total_deductions: totalDeductions,
      net_pay: netPay,
    };
  });

  // Aggregate totals
  const total_gross = round2(lines.reduce((s, l) => s + l.gross, 0));
  const total_paye = round2(lines.reduce((s, l) => s + l.paye, 0));
  const total_nhif = round2(lines.reduce((s, l) => s + l.nhif, 0));
  const total_nssf_employee = round2(lines.reduce((s, l) => s + l.nssf_employee, 0));
  const total_nssf_employer = round2(lines.reduce((s, l) => s + l.nssf_employer, 0));
  const total_net_pay = round2(lines.reduce((s, l) => s + l.net_pay, 0));

  const summary: PayrollSummary = {
    month,
    year,
    employee_count: lines.length,
    total_gross,
    total_paye,
    total_nhif,
    total_nssf_employee,
    total_nssf_employer,
    total_net_pay,
    lines,
  };

  return NextResponse.json({ data: summary });
}
