import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculatePAYE(taxableIncome: number): number {
  const BANDS = [
    { width: 24_000, rate: 0.10 },
    { width: 8_333, rate: 0.25 },
    { width: 467_667, rate: 0.30 },
    { width: 300_000, rate: 0.325 },
    { width: Infinity, rate: 0.35 },
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

function calculateNHIF(grossSalary: number): number {
  return round2(grossSalary * 0.0275);
}

function calculateNSSF(grossSalary: number): { employee: number; employer: number } {
  const LOWER_LIMIT = 7_000;
  const UPPER_LIMIT = 36_000;
  const RATE = 0.06;
  const tierI = round2(Math.min(grossSalary, LOWER_LIMIT) * RATE);
  const tierIIBase = grossSalary > LOWER_LIMIT ? Math.min(grossSalary, UPPER_LIMIT) - LOWER_LIMIT : 0;
  const tierII = round2(tierIIBase * RATE);
  const total = round2(tierI + tierII);
  return { employee: total, employer: total };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const employee_id = searchParams.get("employee_id");
  const month = parseInt(searchParams.get("month") ?? "0", 10);
  const year = parseInt(searchParams.get("year") ?? "0", 10);

  if (!employee_id || !month || !year) {
    return NextResponse.json({ error: "employee_id, month, and year are required" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const db = supabase as any;

  const [{ data: employee }, { data: tenant }] = await Promise.all([
    db
      .from("employees")
      .select("id, employee_number, full_name, department, employment_type, basic_salary, kra_pin, nhif_number, nssf_number, id_number, bank_name, bank_account, bank_branch")
      .eq("id", employee_id)
      .eq("tenant_id", tenantId)
      .single(),
    db
      .from("tenants")
      .select("name, email, phone, address, city, kra_pin, logo_url")
      .eq("id", tenantId)
      .single(),
  ]);

  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const gross = round2(employee.basic_salary);
  const nhif = calculateNHIF(gross);
  const nssf = calculateNSSF(gross);
  const taxableIncome = round2(gross - nssf.employee);
  const paye = calculatePAYE(taxableIncome);
  const totalDeductions = round2(paye + nhif + nssf.employee);
  const netPay = round2(gross - totalDeductions);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  return NextResponse.json({
    data: {
      employee: {
        ...employee,
        // Strip any fields not in supabase types — these may not exist
        kra_pin: employee.kra_pin ?? null,
        nhif_number: employee.nhif_number ?? null,
        nssf_number: employee.nssf_number ?? null,
        id_number: employee.id_number ?? null,
        bank_name: employee.bank_name ?? null,
        bank_account: employee.bank_account ?? null,
        bank_branch: employee.bank_branch ?? null,
      },
      tenant: tenant ?? null,
      month,
      year,
      monthName,
      earnings: {
        basic_salary: gross,
        gross,
      },
      deductions: {
        paye,
        nhif,
        nssf_employee: nssf.employee,
        total: totalDeductions,
      },
      employer_contributions: {
        nssf_employer: nssf.employer,
      },
      net_pay: netPay,
    },
  });
}
