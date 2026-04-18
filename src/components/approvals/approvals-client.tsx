"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, FileText } from "lucide-react";

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

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200",
};

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

  const filtered = useMemo(() => {
    if (tab === "pending") return rows.filter((r) => r.status === "pending");
    if (tab === "all") return rows;
    return rows.filter(
      (r) =>
        r.status === "pending" &&
        (r.approver_user_id === currentUserId ||
          r.approver_role === currentRole ||
          ["super_admin", "tenant_admin"].includes(currentRole))
    );
  }, [rows, tab, currentUserId, currentRole]);

  async function decide(id: string, decision: "approved" | "rejected" | "cancelled") {
    setBusy(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, decision_note: note[id] ?? null }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...json.data } : r)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">Review and decide on pending requests</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="inbox">My Inbox</TabsTrigger>
          <TabsTrigger value="pending">All Pending</TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                No requests to show.
              </CardContent>
            </Card>
          )}
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="capitalize">{r.doc_type.replace("_", " ")}</span>
                    {r.doc_reference && <span className="text-slate-400">· {r.doc_reference}</span>}
                  </CardTitle>
                  <div className="text-xs text-slate-500">
                    {r.amount != null && (
                      <>
                        {r.currency_code ?? "KES"} {Number(r.amount).toLocaleString()}
                        {" · "}
                      </>
                    )}
                    Requested {new Date(r.requested_at).toLocaleString()}
                  </div>
                  {r.approver_role && (
                    <div className="text-xs text-slate-500">
                      Approver: <span className="capitalize">{r.approver_role.replace("_", " ")}</span>
                    </div>
                  )}
                </div>
                <Badge className={`${STATUS_COLOR[r.status]} border capitalize`}>
                  {r.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                  {r.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {r.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                  {r.status}
                </Badge>
              </CardHeader>
              {r.status === "pending" && (
                <CardContent className="pt-0 space-y-3">
                  <Textarea
                    placeholder="Decision note (optional)"
                    value={note[r.id] ?? ""}
                    onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                    className="text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => decide(r.id, "approved")}
                      disabled={busy === r.id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide(r.id, "rejected")}
                      disabled={busy === r.id}
                      className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
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
                <CardContent className="pt-0 text-sm text-slate-600 italic">
                  &ldquo;{r.decision_note}&rdquo;
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
