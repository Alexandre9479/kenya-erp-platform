import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const employmentTypeEnum = z.enum(["permanent", "contract", "casual", "part_time"]);

const createEmployeeSchema = z.object({
  employee_number: z.string().optional(),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  id_number: z.string().optional().nullable(),
  kra_pin: z.string().optional().nullable(),
  nssf_number: z.string().optional().nullable(),
  nhif_number: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  employment_type: employmentTypeEnum,
  basic_salary: z.number().positive("Basic salary must be greater than 0"),
  hire_date: z.string().min(1, "Hire date is required"),
  bank_name: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
});

// ─── GET /api/employees ───────────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const department = searchParams.get("department")?.trim() ?? "";
  const employment_type = searchParams.get("employment_type")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  let query = supabase
    .from("employees")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("full_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,employee_number.ilike.%${search}%`
    );
  }

  if (department) {
    query = query.ilike("department", `%${department}%`);
  }

  if (employment_type) {
    query = query.eq("employment_type", employment_type);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}

// ─── POST /api/employees ──────────────────────────────────────────────────────

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

  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const {
    employee_number,
    full_name,
    email,
    phone,
    id_number,
    kra_pin,
    nssf_number,
    nhif_number,
    department,
    designation,
    employment_type,
    basic_salary,
    hire_date,
    bank_name,
    bank_account,
  } = parsed.data;

  // Auto-generate employee number if not provided
  const empNumber =
    employee_number?.trim() ||
    `EMP-${Date.now().toString().slice(-5)}`;

  const supabase = await createServiceClient();

  // Check for duplicate employee_number within tenant
  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_number", empNumber)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "An employee with this number already exists." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("employees")
    .insert({
      tenant_id: tenantId,
      employee_number: empNumber,
      full_name: full_name.trim(),
      email: email?.trim() ?? null,
      phone: phone?.trim() ?? null,
      id_number: id_number?.trim() ?? null,
      kra_pin: kra_pin?.trim() ?? null,
      nssf_number: nssf_number?.trim() ?? null,
      nhif_number: nhif_number?.trim() ?? null,
      department: department?.trim() ?? null,
      designation: designation?.trim() ?? null,
      employment_type,
      basic_salary,
      hire_date,
      termination_date: null,
      is_active: true,
      bank_name: bank_name?.trim() ?? null,
      bank_account: bank_account?.trim() ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
