"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck, CheckCircle2, XCircle, Clock, FileText, Inbox,
  Search, ShieldCheck, AlertCircle, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  PremiumHero,
  HeroStatGrid,
  HeroStat,
  EmptyState,
} from "@/components/ui/premium-hero";
import { cn } from "@/lib/utils";

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

const STATUS_CONFIG: Record<
  string,
  { bg: string; icon: React.ElementType; label: string; dot: string }
> = {
  pending:   { bg: "bg-amber-50 text-amber-700 border-amber-200",       icon: Clock,        label: "Pending",   dot: "bg-amber-500" },
  approved:  { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Approved",  dot: "bg-emerald-500 animate-pulse" },
  rejected:  { bg: "bg-rose-50 text-rose-700 border-rose-200",          icon: XCircle,      label: "Rejected",  dot: "bg-rose-500" },
  cancelled: { bg: "bg-slate-100 text-slate-600 border-slate-200",      icon: AlertCircle,  label: "Cancelled", dot: "bg-slate-400" },
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
    <div className="space-y-4 sm:space-y-6">
      <PremiumHero
        gradient="amber"
        icon={ShieldCheck}
        eyebrow={
          <>
            <Sparkles className="size-3 sm:size-3.5" />
            Approval Workflows
          </>
        }
        title="Approvals"
        description="Review expenses, purchase orders, journals, leave & timesheet requests — routed by amount or role."
      >
        <HeroStatGrid>
          <HeroStat icon={Inbox} label="In my inbox" value={String(counts.inbox)} sub="awaiting my decision" accent={counts.inbox > 0 ? "warning" : "default"} />
          <HeroStat icon={Clock} label="All pending" value={String(counts.pending)} sub="across the team" />
          <HeroStat icon={CheckCircle2} label="Approved" value={String(counts.approved)} sub="decision logged" accent="success" />
          <HeroStat icon={XCircle} label="Rejected" value={String(counts.rejected)} sub="returned to sender" accent="danger" />
        </HeroStatGrid>
      </PremiumHero>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full md:w-auto">
            <div className="overflow-x-auto pb-0.5">
              <TabsList className="h-10 bg-slate-100 w-max">
                <TabsTrigger value="inbox" className="data-[state=active]:bg-white gap-1.5">
                  <Inbox className="h-3.5 w-3.5" /> Inbox
                  {counts.inbox > 0 && (
                    <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] leading-none px-1.5 py-0.5 font-bold">
                      {counts.inbox}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                  Pending ({counts.pending})
                </TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-white">
                  All ({counts.total})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
          <div className="relative flex-1 md:ml-auto md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by reference, type, role…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 focus-visible:ring-amber-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-white/50">
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardCheck}
                title="Nothing to approve"
                description={
                  tab === "inbox"
                    ? "You're all caught up. Requests routed to you will appear here."
                    : "Requests will appear here when raised."
                }
              />
            </CardContent>
          </Card>
        ) : (
          filtered.map((r) => {
            const cfg = STATUS_CONFIG[r.status];
            const docLabel = DOC_TYPE_LABELS[r.doc_type] ?? r.doc_type;
            const canDecideNow =
              r.status === "pending" &&
              (r.approver_user_id === currentUserId ||
                r.approver_role === currentRole ||
                ["super_admin", "tenant_admin"].includes(currentRole));

            return (
              <Card
                key={r.id}
                className="relative overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500" />
                <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 pt-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex size-10 sm:size-11 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20 shrink-0">
                      <FileText className="size-5 text-white" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <CardTitle className="text-sm sm:text-base flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate">{docLabel}</span>
                        {r.doc_reference && (
                          <span className="font-mono text-[11px] text-slate-400 font-normal">· {r.doc_reference}</span>
                        )}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-500">
                        {r.amount != null && (
                          <span className="font-bold text-slate-700 tabular-nums">
                            {KES(Number(r.amount), r.currency_code ?? "KES")}
                          </span>
                        )}
                        <span className="tabular-nums">
                          {new Date(r.requested_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {r.approver_role && (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="capitalize">{r.approver_role.replace("_", " ")}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold shrink-0 self-start",
                      cfg.bg
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                    {cfg.label}
                  </span>
                </CardHeader>

                {canDecideNow && (
                  <CardContent className="pt-0 space-y-3">
                    <Separator />
                    <Textarea
                      placeholder="Decision note (optional — visible to the requester)"
                      value={note[r.id] ?? ""}
                      onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                      rows={2}
                      className="resize-none focus-visible:ring-amber-500"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => decide(r.id, "approved")}
                        disabled={busy === r.id}
                        className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 gap-1.5"
                      >
                        <CheckCircle2 className="size-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide(r.id, "rejected")}
                        disabled={busy === r.id}
                        className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 gap-1.5"
                      >
                        <XCircle className="size-3.5" /> Reject
                      </Button>
                      {r.requested_by === currentUserId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => decide(r.id, "cancelled")}
                          disabled={busy === r.id}
                          className="text-slate-500 hover:text-slate-700"
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
                        <span className="block not-italic text-[11px] text-slate-400 mt-1 tabular-nums">
                          Decided {new Date(r.decided_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
