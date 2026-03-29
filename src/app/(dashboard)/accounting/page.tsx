"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calculator, Plus, Search, Trash2,
  RefreshCw, TrendingUp, TrendingDown,
  DollarSign, BookOpen, Receipt,
  ArrowUpRight, ArrowDownRight,
  BarChart3, FileText, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/helpers";

type Tab = "overview" | "expenses" | "accounts" | "journals";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: string;
  paymentMethod: string;
  reference?: string;
  accountName?: string;
  accountCode?: string;
  createdAt: string;
}

interface ReportSummary {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number | string;
  receivables: number;
  overdue: number;
}

interface ExpenseByAccount {
  accountName?: string;
  accountCode?: string;
  total: string;
}

interface JournalLine {
  id: string;
  accountId: string;
  accountName?: string;
  accountCode?: string;
  description?: string;
  debit: string;
  credit: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  createdAt: string;
  lines: JournalLine[];
}

const ACCOUNT_TYPE_CONFIG = {
  asset:     { label: "Assets",      color: "bg-blue-100 text-blue-700",   border: "border-blue-200" },
  liability: { label: "Liabilities", color: "bg-red-100 text-red-700",     border: "border-red-200" },
  equity:    { label: "Equity",      color: "bg-purple-100 text-purple-700", border: "border-purple-200" },
  revenue:   { label: "Revenue",     color: "bg-green-100 text-green-700", border: "border-green-200" },
  expense:   { label: "Expenses",    color: "bg-orange-100 text-orange-700", border: "border-orange-200" },
};

const PAYMENT_METHODS = [
  { value: "cash",          label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque",        label: "Cheque" },
  { value: "mpesa",         label: "M-Pesa" },
  { value: "card",          label: "Card" },
];

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [report, setReport]       = useState<{ summary: ReportSummary; expensesByAccount: ExpenseByAccount[] } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    paymentMethod: "cash",
    accountId: "",
    reference: "",
  });
  const [accountForm, setAccountForm] = useState({
    code: "",
    name: "",
    type: "expense",
    description: "",
  });
  const [saving, setSaving] = useState(false);


  const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [showJournalForm, setShowJournalForm] = useState(false);
    const [expandedJournal, setExpandedJournal] = useState<string | null>(null);
    const [journalForm, setJournalForm] = useState({
      date: new Date().toISOString().split("T")[0],
      description: "",
      reference: "",
      lines: [
        { accountId: "", description: "", debit: "", credit: "" },
        { accountId: "", description: "", debit: "", credit: "" },
      ],
    });

  const fetchAll = useCallback(async () => {
  setLoading(true);
  try {
    const [accRes, expRes, repRes, jnlRes] = await Promise.all([
      fetch("/api/accounting/accounts"),
      fetch("/api/accounting/expenses"),
      fetch("/api/accounting/reports"),
      fetch("/api/accounting/journals"),
    ]);
    const [accData, expData, repData, jnlData] = await Promise.all([
      accRes.json(), expRes.json(), repRes.json(), jnlRes.json(),
    ]);
    if (accData.success) setAccounts(accData.data);
    if (expData.success) setExpenses(expData.data);
    if (repData.success) setReport(repData.data);
    if (jnlData.success) setJournals(jnlData.data);
  } catch {
    toast.error("Failed to load accounting data");
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      toast.error("Description and amount are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/accounting/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Expense recorded!");
        setShowExpenseForm(false);
        setExpenseForm({ date: new Date().toISOString().split("T")[0], description: "", amount: "", paymentMethod: "cash", accountId: "", reference: "" });
        fetchAll();
      } else {
        toast.error(data.error || "Failed to record expense");
      }
    } catch {
      toast.error("Failed to record expense");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = async () => {
    if (!accountForm.code || !accountForm.name) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account created!");
        setShowAccountForm(false);
        setAccountForm({ code: "", name: "", type: "expense", description: "" });
        fetchAll();
      } else {
        toast.error(data.error || "Failed to create account");
      }
    } catch {
      toast.error("Failed to create account");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await fetch(`/api/accounting/expenses/${id}`, { method: "DELETE" });
      toast.success("Expense deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    try {
      await fetch(`/api/accounting/accounts/${id}`, { method: "DELETE" });
      toast.success("Account deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const handleAddJournalLine = () => {
  setJournalForm({
    ...journalForm,
    lines: [...journalForm.lines, { accountId: "", description: "", debit: "", credit: "" }],
  });
};

const handleRemoveJournalLine = (index: number) => {
  if (journalForm.lines.length <= 2) return;
  setJournalForm({
    ...journalForm,
    lines: journalForm.lines.filter((_, i) => i !== index),
  });
};

const handleUpdateJournalLine = (index: number, field: string, value: string) => {
  const lines = [...journalForm.lines];
  lines[index] = { ...lines[index], [field]: value };
  setJournalForm({ ...journalForm, lines });
};

const totalDebits = journalForm.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
const totalCredits = journalForm.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

const handleAddJournal = async () => {
  setSaving(true);
  try {
    const res = await fetch("/api/accounting/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...journalForm,
        lines: journalForm.lines.map(l => ({
          ...l,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`Journal entry ${data.data.entryNumber} created!`);
      setShowJournalForm(false);
      setJournalForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
        lines: [
          { accountId: "", description: "", debit: "", credit: "" },
          { accountId: "", description: "", debit: "", credit: "" },
        ],
      });
      fetchAll();
    } else {
      toast.error(data.error || "Failed to create journal entry");
    }
  } catch {
    toast.error("Failed to create journal entry");
  } finally {
    setSaving(false);
  }
};

const handleDeleteJournal = async (id: string) => {
  if (!confirm("Delete this journal entry? This cannot be undone.")) return;
  try {
    await fetch(`/api/accounting/journals/${id}`, { method: "DELETE" });
    toast.success("Journal entry deleted");
    fetchAll();
  } catch {
    toast.error("Failed to delete journal entry");
  }
};

  const filteredAccounts = accounts.filter(a =>
    (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.includes(search)) &&
    (!typeFilter || a.type === typeFilter)
  );

  const filteredExpenses = expenses.filter(e =>
    !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Accounting & Finance</h2>
          <p className="text-slate-500 text-sm mt-1">
            Chart of accounts, expenses, P&L and financial reports
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={fetchAll}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === "expenses" && (
            <button onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25">
              <Plus className="w-4 h-4" /> Record Expense
            </button>
          )}
          {activeTab === "accounts" && (
            <button onClick={() => setShowAccountForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25">
              <Plus className="w-4 h-4" /> Add Account
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {[
        { key: "overview",  label: "P&L Overview",      icon: BarChart3 },
        { key: "expenses",  label: "Expenses",           icon: Receipt },
        { key: "journals",  label: "Journal Entries",    icon: BookOpen },
        { key: "accounts",  label: "Chart of Accounts",  icon: Calculator },
      ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as Tab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-3" />
                  <div className="h-8 bg-slate-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : report ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    label: "Total Revenue",
                    value: fmt(report.summary.totalRevenue),
                    icon: TrendingUp,
                    color: "text-green-600",
                    bg: "bg-green-50",
                    change: "From paid invoices",
                    positive: true,
                  },
                  {
                    label: "Total Expenses",
                    value: fmt(report.summary.totalExpenses),
                    icon: TrendingDown,
                    color: "text-red-600",
                    bg: "bg-red-50",
                    change: "Recorded expenses",
                    positive: false,
                  },
                  {
                    label: "Gross Profit",
                    value: fmt(report.summary.grossProfit),
                    icon: DollarSign,
                    color: report.summary.grossProfit >= 0 ? "text-blue-600" : "text-red-600",
                    bg: report.summary.grossProfit >= 0 ? "bg-blue-50" : "bg-red-50",
                    change: `${report.summary.profitMargin}% margin`,
                    positive: report.summary.grossProfit >= 0,
                  },
                  {
                    label: "Accounts Receivable",
                    value: fmt(report.summary.receivables),
                    icon: FileText,
                    color: "text-yellow-600",
                    bg: "bg-yellow-50",
                    change: "Outstanding invoices",
                    positive: true,
                  },
                  {
                    label: "Overdue Amount",
                    value: fmt(report.summary.overdue),
                    icon: CreditCard,
                    color: "text-orange-600",
                    bg: "bg-orange-50",
                    change: "Overdue invoices",
                    positive: false,
                  },
                  {
                    label: "Net Position",
                    value: fmt(report.summary.totalRevenue - report.summary.totalExpenses + report.summary.receivables),
                    icon: Calculator,
                    color: "text-purple-600",
                    bg: "bg-purple-50",
                    change: "Revenue + Receivables - Expenses",
                    positive: true,
                  },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.bg)}>
                        <card.icon className={cn("w-5 h-5", card.color)} />
                      </div>
                      {card.positive
                        ? <ArrowUpRight className="w-4 h-4 text-green-500" />
                        : <ArrowDownRight className="w-4 h-4 text-red-500" />
                      }
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                    <p className="text-xl font-bold text-slate-900">{card.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{card.change}</p>
                  </div>
                ))}
              </div>

              {/* Expenses Breakdown */}
              {report.expensesByAccount.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Expenses by Account</h3>
                  <div className="space-y-3">
                    {report.expensesByAccount
                      .sort((a, b) => Number(b.total) - Number(a.total))
                      .slice(0, 10)
                      .map((item, i) => {
                        const pct = report.summary.totalExpenses > 0
                          ? (Number(item.total) / report.summary.totalExpenses) * 100
                          : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-orange-600">
                              {item.accountCode?.slice(0, 2) || "—"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  {item.accountName || "Unclassified"}
                                </p>
                                <p className="text-sm font-semibold text-slate-900 ml-2 shrink-0">
                                  {fmt(Number(item.total))}
                                </p>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div
                                  className="bg-orange-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{pct.toFixed(1)}% of total expenses</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* P&L Summary Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Profit & Loss Summary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Current fiscal period</p>
                </div>
                <table className="w-full">
                  <tbody>
                    {[
                      { label: "Total Revenue", value: report.summary.totalRevenue, bold: false, color: "text-green-600" },
                      { label: "Cost of Sales / Expenses", value: -report.summary.totalExpenses, bold: false, color: "text-red-600" },
                      { label: "Gross Profit", value: report.summary.grossProfit, bold: true, color: report.summary.grossProfit >= 0 ? "text-blue-600" : "text-red-600" },
                      { label: "Outstanding Receivables", value: report.summary.receivables, bold: false, color: "text-yellow-600" },
                      { label: "Overdue Receivables", value: report.summary.overdue, bold: false, color: "text-orange-600" },
                    ].map((row, i) => (
                      <tr key={i} className={cn(
                        "border-b border-slate-100 last:border-0",
                        row.bold && "bg-slate-50"
                      )}>
                        <td className={cn("px-5 py-3 text-sm", row.bold ? "font-bold text-slate-900" : "text-slate-600")}>
                          {row.label}
                        </td>
                        <td className={cn("px-5 py-3 text-sm text-right font-semibold", row.color, row.bold && "font-bold text-base")}>
                          {row.value < 0
                            ? `(${fmt(Math.abs(row.value))})`
                            : fmt(row.value)
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-900">No financial data yet</p>
              <p className="text-sm text-slate-500">Start recording expenses and creating invoices</p>
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSES TAB ── */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search expenses..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Add Expense Form */}
          {showExpenseForm && (
            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-lg">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                Record New Expense
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Date *</label>
                  <input type="date" value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Amount (KSh) *</label>
                  <input type="number" min="0" step="0.01" value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00" />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Description *</label>
                <input value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What was this expense for?" />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Payment Method</label>
                  <select value={expenseForm.paymentMethod}
                    onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Account</label>
                  <select value={expenseForm.accountId}
                    onChange={e => setExpenseForm({ ...expenseForm, accountId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select account</option>
                    {accounts.filter(a => a.type === "expense").map(a => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Reference</label>
                  <input value={expenseForm.reference}
                    onChange={e => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Receipt/ref number" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowExpenseForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddExpense} disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2">
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Expense
                </button>
              </div>
            </div>
          )}

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["Date", "Description", "Account", "Payment Method", "Reference", "Amount", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="font-semibold text-slate-900">No expenses recorded</p>
                        <p className="text-sm text-slate-500">Click Record Expense to add one</p>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{expense.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          {expense.accountName ? (
                            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg font-medium">
                              {expense.accountCode} — {expense.accountName}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg capitalize font-medium">
                            {PAYMENT_METHODS.find(m => m.value === expense.paymentMethod)?.label || expense.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {expense.reference || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-red-600 text-sm">
                            {fmt(Number(expense.amount))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteExpense(expense.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredExpenses.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={5} className="px-4 py-3 text-sm font-bold text-slate-900">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {fmt(filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CHART OF ACCOUNTS TAB ── */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search accounts..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Types</option>
                {Object.entries(ACCOUNT_TYPE_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Account Form */}
          {showAccountForm && (
            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-lg">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Add New Account
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Account Code *</label>
                  <input value={accountForm.code}
                    onChange={e => setAccountForm({ ...accountForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 5100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Account Name *</label>
                  <input value={accountForm.name}
                    onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Office Supplies" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Account Type *</label>
                  <select value={accountForm.type}
                    onChange={e => setAccountForm({ ...accountForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(ACCOUNT_TYPE_CONFIG).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
                  <input value={accountForm.description}
                    onChange={e => setAccountForm({ ...accountForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAccountForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddAccount} disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2">
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Add Account
                </button>
              </div>
            </div>
          )}

          {/* Accounts grouped by type */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <RefreshCw className="w-8 h-8 text-slate-300 mx-auto animate-spin mb-3" />
              <p className="text-slate-500">Loading accounts...</p>
            </div>
          ) : (
            Object.entries(ACCOUNT_TYPE_CONFIG).map(([type, config]) => {
              const typeAccounts = filteredAccounts.filter(a => a.type === type);
              if (typeAccounts.length === 0) return null;
              return (
                <div key={type} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className={cn("px-4 py-3 border-b flex items-center justify-between", config.border, "bg-slate-50")}>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", config.color)}>
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-500">{typeAccounts.length} accounts</span>
                    </div>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Code</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Account Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Description</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {typeAccounts.map((account) => (
                        <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {account.code}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-900">
                            {account.name}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-500">
                            {account.description || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button onClick={() => handleDeleteAccount(account.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors mx-auto">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── JOURNALS TAB ── */}
      {activeTab === "journals" && (
        <div className="space-y-4">

          {/* New Journal Form */}
          {showJournalForm && (
            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-lg">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                New Journal Entry
              </h3>

              {/* Header fields */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Date *</label>
                  <input type="date" value={journalForm.date}
                    onChange={e => setJournalForm({ ...journalForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Description *</label>
                  <input value={journalForm.description}
                    onChange={e => setJournalForm({ ...journalForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Journal entry description" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Reference</label>
                  <input value={journalForm.reference}
                    onChange={e => setJournalForm({ ...journalForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. INV-00001" />
                </div>
              </div>

              {/* Lines */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Account</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Description</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Debit</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Credit</th>
                      <th className="w-8 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journalForm.lines.map((line, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5">
                          <select value={line.accountId}
                            onChange={e => handleUpdateJournalLine(index, "accountId", e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Select account</option>
                            {["asset", "liability", "equity", "revenue", "expense"].map(type => (
                              <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                                {accounts.filter(a => a.type === type).map(a => (
                                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={line.description}
                            onChange={e => handleUpdateJournalLine(index, "description", e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Optional" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min="0" step="0.01" value={line.debit}
                            onChange={e => handleUpdateJournalLine(index, "debit", e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                            placeholder="0.00" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min="0" step="0.01" value={line.credit}
                            onChange={e => handleUpdateJournalLine(index, "credit", e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                            placeholder="0.00" />
                        </td>
                        <td className="px-2 py-1.5">
                          <button onClick={() => handleRemoveJournalLine(index)}
                            disabled={journalForm.lines.length <= 2}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={2} className="px-3 py-2">
                        <button onClick={handleAddJournalLine}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                          <Plus className="w-3.5 h-3.5" /> Add Line
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn("font-bold text-sm", isBalanced ? "text-green-600" : "text-red-600")}>
                          {fmt(totalDebits)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn("font-bold text-sm", isBalanced ? "text-green-600" : "text-red-600")}>
                          {fmt(totalCredits)}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balance indicator */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium mb-4",
                isBalanced
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              )}>
                <div className={cn("w-2 h-2 rounded-full", isBalanced ? "bg-green-500" : "bg-red-500")} />
                {isBalanced
                  ? "✓ Journal is balanced — debits equal credits"
                  : `Not balanced — Difference: ${fmt(Math.abs(totalDebits - totalCredits))}`
                }
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowJournalForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddJournal} disabled={saving || !isBalanced}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition-colors flex items-center gap-2">
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Post Journal Entry
                </button>
              </div>
            </div>
          )}

          {/* Journal Entries List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : journals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-900">No journal entries yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Create your first double-entry journal entry
              </p>
              <button onClick={() => setShowJournalForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" /> New Journal Entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {journals.map((entry) => {
                const entryDebits = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
                const isExpanded = expandedJournal === entry.id;
                return (
                  <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {/* Entry Header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedJournal(isExpanded ? null : entry.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {entry.entryNumber}
                            </span>
                            {entry.reference && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                                Ref: {entry.reference}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{entry.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{formatDate(entry.date)}</p>
                          <p className="font-bold text-slate-900 text-sm">{fmt(entryDebits)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteJournal(entry.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className={cn(
                            "w-6 h-6 flex items-center justify-center rounded-lg transition-transform text-slate-400",
                            isExpanded && "rotate-180"
                          )}>
                            ▼
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Lines */}
                    {isExpanded && (
                      <div className="border-t border-slate-200">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Account</th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Description</th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Debit</th>
                              <th className="text-right px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Credit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {entry.lines.map((line, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5">
                                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-2">
                                    {line.accountCode}
                                  </span>
                                  <span className="text-sm text-slate-700">{line.accountName}</span>
                                </td>
                                <td className="px-4 py-2.5 text-sm text-slate-500">
                                  {line.description || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                                  {Number(line.debit) > 0 ? fmt(Number(line.debit)) : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-sm font-medium text-slate-900">
                                  {Number(line.credit) > 0 ? fmt(Number(line.credit)) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50 border-t-2 border-slate-200">
                              <td colSpan={2} className="px-4 py-2 text-sm font-bold text-slate-900">Totals</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-900 text-sm">
                                {fmt(entry.lines.reduce((s, l) => s + Number(l.debit), 0))}
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-slate-900 text-sm">
                                {fmt(entry.lines.reduce((s, l) => s + Number(l.credit), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}