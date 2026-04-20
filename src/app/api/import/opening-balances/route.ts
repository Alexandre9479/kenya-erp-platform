import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { parseCSVToObjects, toNumber } from "@/lib/csv/parse";

const bodySchema = z.object({
  entry_date: z.string().min(1, "Entry date required"),
  description: z.string().min(1, "Description required").default("Opening balances"),
  csv_text: z.string().min(1, "CSV is empty"),
});

type ImportError = { row: number; message: string };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { entry_date, description, csv_text } = parsedBody.data;

  const { headers, rows } = parseCSVToObjects(csv_text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });
  }

  const required = ["account_code", "debit", "credit"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required columns: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  const { data: accountData, error: acctErr } = await supabase
    .from("accounts")
    .select("id, code")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (acctErr) {
    return NextResponse.json(
      { error: `Could not load chart of accounts: ${acctErr.message}` },
      { status: 500 }
    );
  }

  const accountMap = new Map<string, string>();
  (accountData ?? []).forEach((a: { id: string; code: string }) => {
    accountMap.set(a.code.trim(), a.id);
  });

  const errors: ImportError[] = [];
  const lines: Array<{
    account_id: string;
    debit: number;
    credit: number;
    description: string | null;
  }> = [];

  let totalDebit = 0;
  let totalCredit = 0;

  rows.forEach((r, idx) => {
    const rowNum = idx + 2;
    const code = (r.account_code ?? "").trim();
    if (!code) {
      errors.push({ row: rowNum, message: "Account code is required" });
      return;
    }
    const accountId = accountMap.get(code);
    if (!accountId) {
      errors.push({
        row: rowNum,
        message: `Account code "${code}" not found in chart of accounts`,
      });
      return;
    }

    const debit = toNumber(r.debit);
    const credit = toNumber(r.credit);

    if (debit < 0 || credit < 0) {
      errors.push({ row: rowNum, message: "Debit/credit cannot be negative" });
      return;
    }
    if (debit === 0 && credit === 0) {
      errors.push({ row: rowNum, message: "Row has no amount" });
      return;
    }
    if (debit > 0 && credit > 0) {
      errors.push({
        row: rowNum,
        message: "Row has both debit and credit; use two rows",
      });
      return;
    }

    lines.push({
      account_id: accountId,
      debit,
      credit,
      description: (r.description ?? "").trim() || null,
    });

    totalDebit += debit;
    totalCredit += credit;
  });

  if (errors.length > 0) {
    return NextResponse.json(
      {
        inserted: 0,
        failed: errors.length,
        total: rows.length,
        errors,
        error: "Fix row errors before importing",
      },
      { status: 400 }
    );
  }

  if (lines.length < 2) {
    return NextResponse.json(
      { error: "At least two balanced lines are required" },
      { status: 400 }
    );
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json(
      {
        error: `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})`,
      },
      { status: 400 }
    );
  }

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
      reference_type: "opening_balance",
      reference_id: null,
      is_posted: false,
      created_by: userId,
    })
    .select()
    .single();

  if (entryError || !entry) {
    return NextResponse.json(
      { error: entryError?.message ?? "Failed to create journal entry" },
      { status: 500 }
    );
  }

  const entryLines = lines.map((l) => ({
    tenant_id: tenantId,
    entry_id: entry.id,
    account_id: l.account_id,
    debit: l.debit,
    credit: l.credit,
    description: l.description,
  }));

  const { error: linesError } = await supabase
    .from("journal_entry_lines")
    .insert(entryLines);

  if (linesError) {
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return NextResponse.json(
      { error: `Failed to insert lines: ${linesError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    inserted: lines.length,
    failed: 0,
    total: rows.length,
    errors: [],
    entry: {
      id: entry.id,
      entry_number,
      total_debit: totalDebit,
      total_credit: totalCredit,
    },
  });
}
