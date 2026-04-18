"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck, CheckCircle2, XCircle, Clock, FileText, Inbox,
  Search, ShieldCheck, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type Request = {
  id: string;
  doc_type: string;
  doc_id: string;
  doc_reference: string | null;
  amount: number | null;
  currency_code: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_at: string;
  requested_by: string | null;
  approver_role: string | null;
  approver_user_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
};

const STATUS_CONFIG: Record<string, { bg: string; icon: React.ElementType; label: string }> = {
  pending:   { bg: "bg-amber-100 text-amber-800 border-amber-200",     icon: Clock,        label: "Pending"   },
  approved:  { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2, label: "Approved" },
  rejected:  { bg: "bg-rose-100 text-rose-800 border-rose-200",        icon: XCircle,      label: "Rejected"  },
  cancelled: { bg: "bg-slate-100 text-slate-700 border-slate-200",      icon: AlertCircle,  label: "Cancelled" },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  expense: "Expense",
  purchase_order: "Purchase Order",
  journal_entry: "Journal Entry",
  leave_request: "Leave Request",
  timesheet: "Timesheet",
  credit_note: "Credit Note",
  payout: "Payout",
  other: "Other",
};

const KES = (v: number, ccy = "KES") =>
  `${ccy} ${new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v)}`;

export function ApprovalsClient({
  initial, currentUserId, currentRole,
}: {
  initial: Request[];
  currentUserId: string;
  currentRole: string;
}) {
  const [rows, setRows] = useState<Request[]>(initial);
  const [tab, setTab] = useState<"inbox" | "pending" | "all">("inbox");
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c = { inbox: 0, pending: 0, approved: 0, rejected: 0, total: rows.length };
    for (const r of rows) {
      if (r.status === "pending") c.pending++;
      if (r.status === "approved") c.approved++;
      if (r.status === "rejected") c.rejected++;
      if (
        r.status === "pending" &&
        (r.approver_user_id === currentUserId ||
          r.approver_role === currentRole ||
          ["super_admin", "tenant_admin"].includes(currentRole))
      ) c.inbox++;
    }
    return c;
  }, [rows, currentUserId, currentRole]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === "pending") list = rows.filter((r) => r.status === "pending");
    else if (tab === "inbox") list = rows.filter(
      (r) => r.status === "pending" &&
        (r.approver_user_id === currentUserId ||
          r.approver_role === currentRole ||
          ["super_admin", "tenant_admin"].includes(currentRole))
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.doc_type, r.doc_reference ?? "", r.approver_role ?? "", r.decision_note ?? ""]
        .join(" ").toLowerCase().includes(q)
    );
  }, [rows, tab, currentUserId, currentRole, query]);

  async function decide(id: string, decision: "approved" | "rejected" | "cancelled") {
    setBusy(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, decision_note: note[id] ?? null }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...json.data } : r)));
      toast.success(`Request ${decision}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-14"
        style={{ background: "linear-gradient(135deg, #422006 0%, #78350f 45%, #b45309 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-orange-500 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-amber-100 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Approval Workflows</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Approvals</h1>
          <p className="mt-2 text-amber-100/80 text-sm md:text-base max-w-2xl">
            Review expenses, purchase orders, journals, leave &amp; timesheet requests — route them by amount or role.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="In my inbox" value={counts.inbox} icon={Inbox} tone="amber" />
            <StatTile label="All pending" value={counts.pending} icon={Clock} tone="yellow" />
            <StatTile label="Approved" value={counts.approved} icon={CheckCircle2} tone="emerald" />
            <StatTile label="Rejected" value={counts.rejected} icon={XCircle} tone="rose" />
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
        <div className="mx-auto max-w-7xl space-y-5">
          <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
            <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full md:w-auto">
                <TabsList className="h-10 bg-slate-100">
                  <TabsTrigger value="inbox" className="data-[state=active]:bg-white gap-1.5">
                    <Inbox className="h-3.5 w-3.5" /> My Inbox
                    <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] leading-none px-1.5 py-0.5">{counts.inbox}</span>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                    Pending ({counts.pending})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-white">
                    All ({counts.total})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative flex-1 md:ml-auto md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by reference, type, role…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-white/50">
                <CardContent className="p-16 text-center">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <ClipboardCheck className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-base font-semibold text-slate-700">Nothing to approve</p>
                  <p className="text-sm text-slate-500 mt-1">Requests will appear here when raised.</p>
                </CardContent>
              </Card>
            ) : filtered.map((r) => {
              const cfg = STATUS_CONFIG[r.status];
              const Icon = cfg.icon;
              const docLabel = DOC_TYPE_LABELS[r.doc_type] ?? r.doc_type;
              const canDecideNow =
                r.status === "pending" &&
                (r.approver_user_id === currentUserId ||
                  r.approver_role === currentRole ||
                  ["super_admin", "tenant_admin"].includes(currentRole));

              return (
                <Card key={r.id} className="border-slate-200/80 shadow-sm hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {docLabel}
                          {r.doc_reference && (
                            <span className="ml-2 font-mono text-xs text-slate-400">· {r.doc_reference}</span>
                          )}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {r.amount != null && (
                            <span className="font-semibold text-slate-700">
                              {KES(Number(r.amount), r.currency_code ?? "KES")}
                            </span>
                          )}
                          <span>Requested {new Date(r.requested_at).toLocaleString()}</span>
                          {r.approver_role && (
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              <span className="capitalize">{r.approver_role.replace("_", " ")}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={`${cfg.bg} border capitalize gap-1 shrink-0`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </Badge>
                  </CardHeader>

                  {canDecideNow && (
                    <CardContent className="pt-0 space-y-3">
                      <Separator />
                      <Textarea
                        placeholder="Decision note (optional — visible to the requester)"
                        value={note[r.id] ?? ""}
                        onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                        rows={2}
                        className="resize-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => decide(r.id, "approved")}
                          disabled={busy === r.id}
                          className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide(r.id, "rejected")}
                          disabled={busy === r.id}
                          className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        >
                          <XCircle className="h-4 w-4 mr-1.5" /> Reject
                        </Button>
                        {r.requested_by === currentUserId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => decide(r.id, "cancelled")}
                            disabled={busy === r.id}
                          >
                            Cancel request
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  )}
                  {r.status !== "pending" && r.decision_note && (
                    <CardContent className="pt-0">
                      <Separator className="mb-3" />
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-600 italic">
                        &ldquo;{r.decision_note}&rdquo;
                        {r.decided_at && (
                          <span className="block not-italic text-xs text-slate-400 mt-1">
                            Decided {new Date(r.decided_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const TONES = {
  amber:   "from-amber-500 to-orange-600 shadow-amber-500/30",
  yellow:  "from-yellow-500 to-amber-600 shadow-yellow-500/30",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
  rose:    "from-rose-500 to-red-600 shadow-rose-500/30",
} as const;

function StatTile({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: React.ElementType; tone: keyof typeof TONES }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${TONES[tone]} shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{label}</div>
        <div className="text-xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}
