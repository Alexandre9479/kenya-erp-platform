"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Clock, LogIn, LogOut, MapPin, Users, UserCheck,
  CalendarDays, Timer, Fingerprint, Navigation,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Employee = { id: string; first_name: string; last_name: string; employee_code: string | null };
type AttRecord = {
  id: string; employee_id: string; work_date: string;
  clock_in: string | null; clock_out: string | null;
  hours_worked: number | null; source: string | null;
  lat: number | null; lng: number | null; status: string | null;
  employees?: { first_name: string; last_name: string } | null;
};

const SOURCE_ICON: Record<string, React.ElementType> = {
  web: Clock, manual: Clock, mobile: Navigation, biometric: Fingerprint, geofence: MapPin,
};

const STATUS_COLOR: Record<string, string> = {
  present:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  late:      "bg-amber-100 text-amber-700 border-amber-200",
  absent:    "bg-rose-100 text-rose-700 border-rose-200",
  leave:     "bg-violet-100 text-violet-700 border-violet-200",
  holiday:   "bg-sky-100 text-sky-700 border-sky-200",
  half_day:  "bg-orange-100 text-orange-700 border-orange-200",
};

export function AttendanceClient({
  employees, today,
}: { employees: Employee[]; today: AttRecord[] }) {
  const [records, setRecords] = useState<AttRecord[]>(today);
  const [empId, setEmpId] = useState("");
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const selected = employees.find((e) => e.id === empId);
  const myToday = records.find((r) => r.employee_id === empId);

  const stats = useMemo(() => {
    const present = records.filter((r) => r.clock_in && !r.clock_out).length;
    const done = records.filter((r) => r.clock_in && r.clock_out).length;
    const hours = records.reduce((s, r) => s + Number(r.hours_worked ?? 0), 0);
    return {
      total: employees.length,
      present,
      done,
      hours: Math.round(hours * 10) / 10,
    };
  }, [records, employees]);

  function captureGeo() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by this browser");
      return;
    }
    toast.loading("Requesting location…", { id: "geo" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location captured", { id: "geo" });
      },
      () => toast.error("Location permission denied", { id: "geo" }),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  async function clock(action: "in" | "out") {
    if (!empId) { toast.error("Select an employee first"); return; }
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
      if (!res.ok) { toast.error(json.error ?? "Failed"); return; }
      const emp = employees.find((e) => e.id === empId);
      const withEmp = {
        ...json.data,
        employees: emp ? { first_name: emp.first_name, last_name: emp.last_name } : null,
      };
      setRecords((prev) => {
        const others = prev.filter((r) => r.id !== withEmp.id);
        return [withEmp, ...others];
      });
      toast.success(`${emp?.first_name ?? "Employee"} clocked ${action}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="-m-4 md:-m-6">
      <div
        className="relative overflow-hidden px-4 sm:px-6 md:px-10 pt-8 pb-16"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #6d28d9 100%)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-purple-500 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-fuchsia-500/40 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100 backdrop-blur">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">Attendance</h1>
          <p className="mt-2 text-indigo-100/80 text-sm md:text-base max-w-2xl">
            Clock in and out with optional geolocation. Source is tracked automatically for compliance.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <HeroStat label="Workforce" value={stats.total} icon={Users} tone="indigo" />
            <HeroStat label="On the clock" value={stats.present} icon={UserCheck} tone="emerald" />
            <HeroStat label="Completed" value={stats.done} icon={LogOut} tone="purple" />
            <HeroStat label="Hours today" value={stats.hours} icon={Timer} tone="fuchsia" />
          </div>
        </div>
      </div>

      <div className="-mt-10 px-4 sm:px-6 md:px-10 pb-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <Card className="border-slate-200/80 shadow-xl shadow-indigo-500/10 overflow-hidden">
              <div className="h-1.5 bg-linear-to-r from-indigo-500 via-violet-500 to-purple-600" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  Clock In / Out
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={empId} onValueChange={setEmpId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                        {e.employee_code ? ` · ${e.employee_code}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selected && myToday && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Clocked in</span>
                      <span className="font-mono font-medium">
                        {myToday.clock_in ? new Date(myToday.clock_in).toLocaleTimeString() : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Clocked out</span>
                      <span className="font-mono font-medium">
                        {myToday.clock_out ? new Date(myToday.clock_out).toLocaleTimeString() : "—"}
                      </span>
                    </div>
                    {myToday.hours_worked != null && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Hours</span>
                        <span className="font-bold">{myToday.hours_worked}h</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => clock("in")}
                    disabled={busy || !empId}
                    className="h-11 bg-linear-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20"
                  >
                    <LogIn className="h-4 w-4 mr-1.5" /> Clock In
                  </Button>
                  <Button
                    onClick={() => clock("out")}
                    disabled={busy || !empId}
                    variant="outline"
                    className="h-11 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  >
                    <LogOut className="h-4 w-4 mr-1.5" /> Clock Out
                  </Button>
                </div>

                <button
                  onClick={captureGeo}
                  className="w-full rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-white px-3 py-2.5 text-left text-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className={`h-4 w-4 ${coords ? "text-emerald-600" : "text-slate-400"}`} />
                    <div className="flex-1">
                      <div className="font-medium text-slate-700">
                        {coords ? "Location captured" : "Tap to capture location"}
                      </div>
                      <div className="text-slate-400 font-mono">
                        {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Optional — geofenced clock-in"}
                      </div>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-lg shadow-slate-200/40">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Today&rsquo;s Activity</CardTitle>
                  <span className="text-xs text-slate-400">{records.length} record{records.length === 1 ? "" : "s"}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
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
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Clock className="h-8 w-8 text-slate-300" />
                            <span>No records yet today.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : records.map((r) => {
                      const SourceIcon = SOURCE_ICON[r.source ?? "web"] ?? Clock;
                      const initials = r.employees
                        ? `${r.employees.first_name[0]}${r.employees.last_name[0]}`.toUpperCase()
                        : "??";
                      return (
                        <TableRow key={r.id} className="hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold grid place-items-center">
                                {initials}
                              </div>
                              <span className="font-medium">
                                {r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {r.clock_out ? new Date(r.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{r.hours_worked ?? "—"}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 capitalize">
                              <SourceIcon className="h-3 w-3" /> {r.source ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLOR[r.status ?? ""] ?? "bg-slate-100 text-slate-700 border-slate-200"} border capitalize`}>
                              {r.status?.replace("_", " ") ?? "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

const TONES = {
  indigo:  "from-indigo-500 to-blue-600 shadow-indigo-500/30",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
  purple:  "from-purple-500 to-violet-600 shadow-purple-500/30",
  fuchsia: "from-fuchsia-500 to-pink-600 shadow-fuchsia-500/30",
} as const;

function HeroStat({
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
