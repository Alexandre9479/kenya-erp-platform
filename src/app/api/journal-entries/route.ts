import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const lineSchema = z.object({
  account_id: z.string().min(1, "Account required"),
  debit: z.number().min(0),
  credit: z.number().min(0),
  description: z.string().optional().nullable(),
}).refine((l) => (l.debit > 0 && l.credit === 0) || (l.credit > 0 && l.debit === 0), {
  message: "Each line must have either a debit or credit, not both",
});

const createSchema = z.object({
  description: z.string().min(1, "Description required"),
  entry_date: z.string().min(1, "Date required"),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(2, "At least two lines required"),
}).refine((d) => {
  const totalDebit = d.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = d.lines.reduce((s, l) => s + l.credit, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01;
}, { message: "Debits must equal credits" });

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  const { data, error, count } = await supabase
    .from("journal_entries")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("entry_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { description, entry_date, reference_type, reference_id, lines } = parsed.data;

  const supabase = await createServiceClient();

  // Generate entry number
  const { data: docNum } = await supabase.rpc("next_doc_number", {
    p_tenant_id: tenantId,
    p_doc_type: "journal",
  });
  const entry_number = `JE-${String(docNum ?? Date.now()).padStart(6, "0")}`;

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .insert({
      tenant_id: tenantId,
      entry_number,
      description,
      entry_date,
      reference_type: reference_type ?? null,
      reference_id: reference_id ?? null,
      is_posted: false,
      created_by: userId,
    })
    .select()
    .single();

  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 });

  const entryLines = lines.map((l) => ({
    tenant_id: tenantId,
    entry_id: entry.id,
    account_id: l.account_id,
    debit: l.debit,
    credit: l.credit,
    description: l.description ?? null,
  }));

  const { error: linesError } = await supabase.from("journal_entry_lines").insert(entryLines);
  if (linesError) {
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return NextResponse.json({ error: linesError.message }, { status: 500 });
  }

  return NextResponse.json({ data: entry }, { status: 201 });
}
