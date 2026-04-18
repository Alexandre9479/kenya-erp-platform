import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data } = await db
    .from("activity_log")
    .select("*, users(name, email)")
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500 mt-1">Every action taken across the platform</p>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-slate-500">No activity yet.</TableCell></TableRow>
            ) : rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.users?.name ?? r.users?.email ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{r.action}</Badge></TableCell>
                <TableCell className="text-xs text-slate-600">
                  <span className="capitalize">{r.entity_type}</span>
                  {r.entity_id && <span className="text-slate-400"> · {String(r.entity_id).slice(0, 8)}</span>}
                </TableCell>
                <TableCell className="text-sm">{r.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
