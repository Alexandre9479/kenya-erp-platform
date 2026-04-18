"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, MapPin } from "lucide-react";

type Employee = { id: string; first_name: string; last_name: string; employee_code: string | null };
type Record = {
  id: string; employee_id: string; work_date: string;
  clock_in: string | null; clock_out: string | null;
  hours_worked: number | null; source: string | null;
  lat: number | null; lng: number | null; status: string | null;
  employees?: { first_name: string; last_name: string } | null;
};

export function AttendanceClient({ employees, today }: { employees: Employee[]; today: Record[] }) {
  const [records, setRecords] = useState<Record[]>(today);
  const [empId, setEmpId] = useState("");
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  function captureGeo() {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert("Location permission denied"),
      { timeout: 10000 }
    );
  }

  async function clock(action: "in" | "out") {
    if (!empId) { alert("Select employee first"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: empId, action,
          source: coords ? "geofence" : "web",
          lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? "Failed"); return; }
      const emp = employees.find((e) => e.id === empId);
      const withEmp = { ...json.data, employees: emp ? { first_name: emp.first_name, last_name: emp.last_name } : null };
      setRecords((prev) => {
        const others = prev.filter((r) => r.id !== withEmp.id);
        return [withEmp, ...others];
      });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500 mt-1">Clock in and out — track employee hours</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Clock In / Out</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.first_name} {e.last_name} {e.employee_code ? `· ${e.employee_code}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => clock("in")} disabled={busy || !empId}>
              <LogIn className="h-4 w-4 mr-1" /> Clock In
            </Button>
            <Button variant="outline" onClick={() => clock("out")} disabled={busy || !empId}>
              <LogOut className="h-4 w-4 mr-1" /> Clock Out
            </Button>
            <Button variant="ghost" onClick={captureGeo}>
              <MapPin className="h-4 w-4 mr-1" />
              {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Capture location"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Today</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-500">No records today.</TableCell></TableRow>
              ) : records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "—"}</TableCell>
                  <TableCell>{r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell>{r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{r.hours_worked ?? "—"}</TableCell>
                  <TableCell className="capitalize">{r.source ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status ?? "—"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
