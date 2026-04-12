import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/types/supabase";

// ─── Validation Schema ────────────────────────────────────────────────────────

const updateEmployeeSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  id_number: z.string().optional().nullable(),
  kra_pin: z.string().optional().nullable(),
  nssf_number: z.string().optional().nullable(),
  nhif_number: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  employment_type: z
    .enum(["permanent", "contract", "casual", "part_time"])
    .optional(),
  basic_salary: z.number().positive().optional(),
  hire_date: z.string().optional(),
  bank_name: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
});

// ─── PATCH /api/employees/[id] ────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const supabase = await createServiceClient();

  // Verify employee belongs to this tenant
  const { data: existing, error: fetchError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Build update payload — trim string fields
  const raw = parsed.data;
  const updatePayload: TablesUpdate<"employees"> = {};

  if (raw.full_name !== undefined) updatePayload.full_name = raw.full_name.trim();
  if (raw.email !== undefined) updatePayload.email = raw.email?.trim() ?? null;
  if (raw.phone !== undefined) updatePayload.phone = raw.phone?.trim() ?? null;
  if (raw.id_number !== undefined) updatePayload.id_number = raw.id_number?.trim() ?? null;
  if (raw.kra_pin !== undefined) updatePayload.kra_pin = raw.kra_pin?.trim() ?? null;
  if (raw.nssf_number !== undefined) updatePayload.nssf_number = raw.nssf_number?.trim() ?? null;
  if (raw.nhif_number !== undefined) updatePayload.nhif_number = raw.nhif_number?.trim() ?? null;
  if (raw.department !== undefined) updatePayload.department = raw.department?.trim() ?? null;
  if (raw.designation !== undefined) updatePayload.designation = raw.designation?.trim() ?? null;
  if (raw.employment_type !== undefined) updatePayload.employment_type = raw.employment_type;
  if (raw.basic_salary !== undefined) updatePayload.basic_salary = raw.basic_salary;
  if (raw.hire_date !== undefined) updatePayload.hire_date = raw.hire_date;
  if (raw.bank_name !== undefined) updatePayload.bank_name = raw.bank_name?.trim() ?? null;
  if (raw.bank_account !== undefined) updatePayload.bank_account = raw.bank_account?.trim() ?? null;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("employees")
    .update(updatePayload)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── DELETE /api/employees/[id] — soft delete ─────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Verify employee belongs to this tenant
  const { data: existing, error: fetchError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { error } = await supabase
    .from("employees")
    .update({
      is_active: false,
      termination_date: today,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Employee deactivated successfully" });
}
