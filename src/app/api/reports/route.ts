import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "summary";
  const from = searchParams.get("from") ?? new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

  const supabase = await createServiceClient();

  if (type === "summary") {
    const [invoicesResult, posResult, customersResult, productsResult, stockResult, paymentsResult] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_amount, amount_paid, status, issue_date")
        .eq("tenant_id", tenantId)
        .gte("issue_date", from)
        .lte("issue_date", to),
      supabase
        .from("purchase_orders")
        .select("total_amount, status, issue_date")
        .eq("tenant_id", tenantId)
        .gte("issue_date", from)
        .lte("issue_date", to),
      supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      supabase
        .from("products")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
      supabase
        .from("stock_levels")
        .select("quantity")
        .eq("tenant_id", tenantId),
      supabase
        .from("invoices")
        .select("amount_paid, issue_date")
        .eq("tenant_id", tenantId)
        .gte("issue_date", from)
        .lte("issue_date", to)
        .gt("amount_paid", 0),
    ]);

    const invoices = invoicesResult.data ?? [];
    const pos = posResult.data ?? [];

    const totalRevenue = invoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
    const totalReceived = invoices.reduce((s, i) => s + (i.amount_paid ?? 0), 0);
    const totalPurchases = pos.reduce((s, p) => s + (p.total_amount ?? 0), 0);
    const outstanding = totalRevenue - totalReceived;
    const invoiceCount = invoices.length;
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    const overdueCount = invoices.filter((i) => i.status === "overdue" || (i.status === "sent" && new Date(i.issue_date) < new Date())).length;
    const totalStockItems = (stockResult.data ?? []).reduce((s, sl) => s + (sl.quantity ?? 0), 0);

    // Monthly revenue breakdown (last 6 months)
    const monthlyMap: Record<string, { revenue: number; received: number }> = {};
    invoices.forEach((inv) => {
      const month = inv.issue_date.substring(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, received: 0 };
      monthlyMap[month].revenue += inv.total_amount ?? 0;
      monthlyMap[month].received += inv.amount_paid ?? 0;
    });
    const monthly = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, vals]) => ({ month, ...vals }));

    return NextResponse.json({
      data: {
        totalRevenue,
        totalReceived,
        outstanding,
        totalPurchases,
        invoiceCount,
        paidCount,
        overdueCount,
        customerCount: customersResult.data?.length ?? 0,
        productCount: productsResult.data?.length ?? 0,
        totalStockItems,
        monthly,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRIAL BALANCE
  // ═══════════════════════════════════════════════════════════════════════
  if (type === "trial_balance") {
    // Get all accounts
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, code, name, type, sub_type")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("code");

    // Get all posted journal entry lines up to the "to" date
    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_posted", true)
      .lte("entry_date", to);

    const entryIds = (entries ?? []).map((e) => e.id);
    let lines: { account_id: string; debit: number; credit: number }[] = [];

    if (entryIds.length > 0) {
      const { data: jLines } = await supabase
        .from("journal_entry_lines")
        .select("account_id, debit, credit")
        .in("entry_id", entryIds);
      lines = (jLines ?? []) as typeof lines;
    }

    // Aggregate by account
    const balanceMap: Record<string, { debit: number; credit: number }> = {};
    for (const line of lines) {
      if (!balanceMap[line.account_id]) balanceMap[line.account_id] = { debit: 0, credit: 0 };
      balanceMap[line.account_id].debit += line.debit ?? 0;
      balanceMap[line.account_id].credit += line.credit ?? 0;
    }

    const rows = (accounts ?? []).map((acc) => {
      const b = balanceMap[acc.id] ?? { debit: 0, credit: 0 };
      return { ...acc, debit: b.debit, credit: b.credit, balance: b.debit - b.credit };
    }).filter((r) => r.debit !== 0 || r.credit !== 0);

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return NextResponse.json({ data: { rows, totalDebit, totalCredit, asAt: to } });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROFIT & LOSS (Income Statement)
  // ═══════════════════════════════════════════════════════════════════════
  if (type === "profit_loss") {
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, code, name, type, sub_type")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("type", ["revenue", "expense"])
      .order("code");

    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_posted", true)
      .gte("entry_date", from)
      .lte("entry_date", to);

    const entryIds = (entries ?? []).map((e) => e.id);
    let lines: { account_id: string; debit: number; credit: number }[] = [];
    if (entryIds.length > 0) {
      const { data: jLines } = await supabase
        .from("journal_entry_lines")
        .select("account_id, debit, credit")
        .in("entry_id", entryIds);
      lines = (jLines ?? []) as typeof lines;
    }

    const balanceMap: Record<string, number> = {};
    for (const line of lines) {
      balanceMap[line.account_id] = (balanceMap[line.account_id] ?? 0) + (line.debit ?? 0) - (line.credit ?? 0);
    }

    const revenueAccounts = (accounts ?? []).filter((a) => a.type === "revenue").map((a) => ({
      ...a, amount: Math.abs(balanceMap[a.id] ?? 0),
    })).filter((a) => a.amount !== 0);

    const expenseAccounts = (accounts ?? []).filter((a) => a.type === "expense").map((a) => ({
      ...a, amount: Math.abs(balanceMap[a.id] ?? 0),
    })).filter((a) => a.amount !== 0);

    const totalRevenue = revenueAccounts.reduce((s, a) => s + a.amount, 0);
    const totalExpenses = expenseAccounts.reduce((s, a) => s + a.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    return NextResponse.json({
      data: { revenueAccounts, expenseAccounts, totalRevenue, totalExpenses, netProfit, from, to },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BALANCE SHEET
  // ═══════════════════════════════════════════════════════════════════════
  if (type === "balance_sheet") {
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, code, name, type, sub_type")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("type", ["asset", "liability", "equity"])
      .order("code");

    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_posted", true)
      .lte("entry_date", to);

    const entryIds = (entries ?? []).map((e) => e.id);
    let lines: { account_id: string; debit: number; credit: number }[] = [];
    if (entryIds.length > 0) {
      const { data: jLines } = await supabase
        .from("journal_entry_lines")
        .select("account_id, debit, credit")
        .in("entry_id", entryIds);
      lines = (jLines ?? []) as typeof lines;
    }

    const balanceMap: Record<string, number> = {};
    for (const line of lines) {
      balanceMap[line.account_id] = (balanceMap[line.account_id] ?? 0) + (line.debit ?? 0) - (line.credit ?? 0);
    }

    const assetAccounts = (accounts ?? []).filter((a) => a.type === "asset").map((a) => ({
      ...a, amount: balanceMap[a.id] ?? 0,
    })).filter((a) => a.amount !== 0);

    const liabilityAccounts = (accounts ?? []).filter((a) => a.type === "liability").map((a) => ({
      ...a, amount: Math.abs(balanceMap[a.id] ?? 0),
    })).filter((a) => a.amount !== 0);

    const equityAccounts = (accounts ?? []).filter((a) => a.type === "equity").map((a) => ({
      ...a, amount: Math.abs(balanceMap[a.id] ?? 0),
    })).filter((a) => a.amount !== 0);

    // Also compute retained earnings (revenue - expense from journal entries up to date)
    const { data: allAccounts } = await supabase
      .from("accounts")
      .select("id, type")
      .eq("tenant_id", tenantId)
      .in("type", ["revenue", "expense"]);

    let retainedEarnings = 0;
    for (const acc of allAccounts ?? []) {
      const bal = balanceMap[acc.id] ?? 0;
      if (acc.type === "revenue") retainedEarnings += Math.abs(bal);
      if (acc.type === "expense") retainedEarnings -= Math.abs(bal);
    }

    const totalAssets = assetAccounts.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = liabilityAccounts.reduce((s, a) => s + a.amount, 0);
    const totalEquity = equityAccounts.reduce((s, a) => s + a.amount, 0) + retainedEarnings;

    return NextResponse.json({
      data: {
        assetAccounts, liabilityAccounts, equityAccounts,
        totalAssets, totalLiabilities, totalEquity, retainedEarnings, asAt: to,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNTS RECEIVABLE AGING
  // ═══════════════════════════════════════════════════════════════════════
  if (type === "ar_aging") {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, customer_id, due_date, total_amount, amount_paid, status")
      .eq("tenant_id", tenantId)
      .in("status", ["sent", "partial", "overdue"])
      .order("due_date");

    const rows = invoices ?? [];
    const customerIds = [...new Set(rows.map((i) => i.customer_id))];
    let customerMap: Record<string, string> = {};
    if (customerIds.length > 0) {
      const { data: custs } = await supabase.from("customers").select("id, name").in("id", customerIds);
      (custs ?? []).forEach((c) => { customerMap[c.id] = c.name; });
    }

    const now = new Date();
    const aged = rows.map((inv) => {
      const balance = inv.total_amount - inv.amount_paid;
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      let bucket: string;
      if (daysOverdue === 0) bucket = "current";
      else if (daysOverdue <= 30) bucket = "1_30";
      else if (daysOverdue <= 60) bucket = "31_60";
      else if (daysOverdue <= 90) bucket = "61_90";
      else bucket = "90_plus";
      return {
        ...inv,
        customer_name: customerMap[inv.customer_id] ?? "—",
        balance,
        daysOverdue,
        bucket,
      };
    });

    // Summary by bucket
    const buckets = { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 };
    for (const r of aged) {
      buckets[r.bucket as keyof typeof buckets] += r.balance;
    }

    return NextResponse.json({ data: { rows: aged, buckets, total: aged.reduce((s, r) => s + r.balance, 0) } });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNTS PAYABLE AGING
  // ═══════════════════════════════════════════════════════════════════════
  if (type === "ap_aging") {
    const { data: pos } = await supabase
      .from("purchase_orders")
      .select("id, lpo_number, supplier_id, expected_date, total_amount, status, issue_date")
      .eq("tenant_id", tenantId)
      .in("status", ["sent", "approved", "partial", "received"]);

    const rows = pos ?? [];
    const supplierIds = [...new Set(rows.map((p) => p.supplier_id))];
    let supplierMap: Record<string, string> = {};
    if (supplierIds.length > 0) {
      const { data: sups } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);
      (sups ?? []).forEach((s) => { supplierMap[s.id] = s.name; });
    }

    const now = new Date();
    const aged = rows.map((po) => {
      const dueDate = new Date(po.expected_date ?? po.issue_date);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      let bucket: string;
      if (daysOverdue === 0) bucket = "current";
      else if (daysOverdue <= 30) bucket = "1_30";
      else if (daysOverdue <= 60) bucket = "31_60";
      else if (daysOverdue <= 90) bucket = "61_90";
      else bucket = "90_plus";
      return {
        ...po,
        supplier_name: supplierMap[po.supplier_id] ?? "—",
        daysOverdue,
        bucket,
      };
    });

    const buckets = { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 };
    for (const r of aged) {
      buckets[r.bucket as keyof typeof buckets] += r.total_amount;
    }

    return NextResponse.json({ data: { rows: aged, buckets, total: aged.reduce((s, r) => s + r.total_amount, 0) } });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VAT SUMMARY (for KRA filing)
  // ═══════════════════════════════════════════════════════════════════════
  if (type === "vat_summary") {
    // Output VAT (sales)
    const { data: invoices } = await supabase
      .from("invoices")
      .select("invoice_number, issue_date, total_amount, tax_amount, status")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelled")
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date");

    // Input VAT (purchases)
    const { data: pos } = await supabase
      .from("purchase_orders")
      .select("lpo_number, issue_date, total_amount, tax_amount, status")
      .eq("tenant_id", tenantId)
      .neq("status", "cancelled")
      .gte("issue_date", from)
      .lte("issue_date", to)
      .order("issue_date");

    const salesRows = invoices ?? [];
    const purchaseRows = pos ?? [];
    const outputVAT = salesRows.reduce((s, i) => s + (i.tax_amount ?? 0), 0);
    const inputVAT = purchaseRows.reduce((s, p) => s + (p.tax_amount ?? 0), 0);
    const netVAT = outputVAT - inputVAT;

    return NextResponse.json({
      data: {
        salesRows, purchaseRows,
        outputVAT, inputVAT, netVAT,
        from, to,
        vatPayable: netVAT > 0 ? netVAT : 0,
        vatRefundable: netVAT < 0 ? Math.abs(netVAT) : 0,
      },
    });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
