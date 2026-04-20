import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { parseCSVToObjects, toNumber, orNull } from "@/lib/csv/parse";

const rowSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z
    .union([z.email(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  kra_pin: z.string().max(20).nullable().optional(),
  credit_limit: z.number().min(0).default(0),
  notes: z.string().max(2000).nullable().optional(),
});

type ImportError = { row: number; message: string };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;

  let body: { csv_text?: string };
  try {
    body = (await req.json()) as { csv_text?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const csv = (body.csv_text ?? "").trim();
  if (!csv) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
  }

  const { headers, rows } = parseCSVToObjects(csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });
  }

  const required = ["name"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required columns: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  const errors: ImportError[] = [];
  const validRows: Array<{
    tenant_id: string;
    is_active: boolean;
    current_balance: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    kra_pin: string | null;
    credit_limit: number;
    notes: string | null;
  }> = [];

  rows.forEach((r, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexed
    const candidate = {
      name: (r.name ?? "").trim(),
      email: (r.email ?? "").trim(),
      phone: orNull(r.phone),
      address: orNull(r.address),
      city: orNull(r.city),
      kra_pin: orNull(r.kra_pin ?? r.kra_pin ?? r["kra-pin"]),
      credit_limit: toNumber(r.credit_limit),
      notes: orNull(r.notes),
    };

    const parsed = rowSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({
        row: rowNum,
        message: parsed.error.issues[0]?.message ?? "Validation failed",
      });
      return;
    }

    validRows.push({
      tenant_id: tenantId,
      is_active: true,
      current_balance: 0,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      kra_pin: parsed.data.kra_pin ?? null,
      credit_limit: parsed.data.credit_limit,
      notes: parsed.data.notes ?? null,
    });
  });

  let inserted = 0;
  if (validRows.length > 0) {
    const { data, error } = await supabase
      .from("customers")
      .insert(validRows)
      .select("id");

    if (error) {
      console.error("[POST /api/import/customers]", error);
      return NextResponse.json(
        { error: `Insert failed: ${error.message}`, errors },
        { status: 500 }
      );
    }
    inserted = data?.length ?? 0;
  }

  return NextResponse.json({
    inserted,
    failed: errors.length,
    total: rows.length,
    errors,
  });
}
