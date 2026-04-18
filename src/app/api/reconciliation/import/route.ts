import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { parseGenericCSV, parseMpesaCSV } from "@/lib/reconciliation/parsers";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    bank_account_id,
    payment_channel_id,
    source,
    filename,
    csv_text,
    statement_date,
    opening_balance,
    closing_balance,
  } = body as {
    bank_account_id?: string | null;
    payment_channel_id?: string | null;
    source: "csv" | "mpesa";
    filename?: string;
    csv_text: string;
    statement_date?: string;
    opening_balance?: number;
    closing_balance?: number;
  };

  if ((!bank_account_id && !payment_channel_id) || !csv_text) {
    return NextResponse.json(
      { error: "Provide a payment source (bank account or payment channel) and csv_text" },
      { status: 400 }
    );
  }
  if (bank_account_id && payment_channel_id) {
    return NextResponse.json(
      { error: "Provide either bank_account_id or payment_channel_id, not both" },
      { status: 400 }
    );
  }

  const lines = source === "mpesa" ? parseMpesaCSV(csv_text) : parseGenericCSV(csv_text);
  if (lines.length === 0) {
    return NextResponse.json(
      { error: "No valid transactions found. Check the CSV format." },
      { status: 400 }
    );
  }

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  let resolvedBankAccountId: string | null = bank_account_id ?? null;
  let resolvedChannelId: string | null = payment_channel_id ?? null;

  if (bank_account_id) {
    const { data: bankAcc } = await db
      .from("bank_accounts")
      .select("id")
      .eq("id", bank_account_id)
      .eq("tenant_id", tenantId)
      .single();
    if (!bankAcc) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }
  } else if (payment_channel_id) {
    const { data: channel } = await db
      .from("payment_channels")
      .select("id, channel_type, bank_account_id")
      .eq("id", payment_channel_id)
      .eq("tenant_id", tenantId)
      .single();
    if (!channel) {
      return NextResponse.json({ error: "Payment channel not found" }, { status: 404 });
    }
    // If the channel is a bank channel, store against the linked bank account for
    // compatibility with existing match logic.
    if (channel.channel_type === "bank" && channel.bank_account_id) {
      resolvedBankAccountId = channel.bank_account_id;
      resolvedChannelId = null;
    }
  }

  const dates = lines.map((l) => l.line_date).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];

  // Insert statement header
  const { data: statement, error: stmtErr } = await db
    .from("bank_statements")
    .insert({
      tenant_id: tenantId,
      bank_account_id: resolvedBankAccountId,
      payment_channel_id: resolvedChannelId,
      statement_date: statement_date ?? periodEnd,
      period_start: periodStart,
      period_end: periodEnd,
      opening_balance: opening_balance ?? 0,
      closing_balance: closing_balance ?? lines[lines.length - 1]?.running_balance ?? 0,
      source: source ?? "csv",
      filename: filename ?? null,
      line_count: lines.length,
      imported_by: session.user.id,
    })
    .select()
    .single();

  if (stmtErr || !statement) {
    return NextResponse.json({ error: stmtErr?.message ?? "Insert failed" }, { status: 500 });
  }

  // Insert lines in batches
  const linesToInsert = lines.map((l) => ({
    tenant_id: tenantId,
    statement_id: statement.id,
    bank_account_id: resolvedBankAccountId,
    payment_channel_id: resolvedChannelId,
    line_date: l.line_date,
    description: l.description,
    reference: l.reference,
    amount: l.amount,
    running_balance: l.running_balance,
    payer_name: l.payer_name,
    payer_phone: l.payer_phone,
    status: "unmatched",
  }));

  const { error: linesErr } = await db.from("bank_statement_lines").insert(linesToInsert);
  if (linesErr) {
    await db.from("bank_statements").delete().eq("id", statement.id);
    return NextResponse.json({ error: linesErr.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      statement,
      line_count: lines.length,
      period_start: periodStart,
      period_end: periodEnd,
    },
  }, { status: 201 });
}
