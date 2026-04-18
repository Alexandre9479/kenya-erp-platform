import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { AttendanceClient } from "@/components/attendance/attendance-client";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const supabase = await createServiceClient();
  const db = supabase as any;
  const today = new Date().toISOString().slice(0, 10);

  const [empRes, recRes] = await Promise.all([
    db.from("employees").select("id, first_name, last_name, employee_code")
      .eq("tenant_id", session.user.tenantId).eq("is_active", true).order("first_name"),
    db.from("attendance_records").select("*, employees(first_name, last_name)")
      .eq("tenant_id", session.user.tenantId).gte("work_date", today)
      .order("clock_in", { ascending: false }),
  ]);

  return <AttendanceClient employees={empRes.data ?? []} today={recRes.data ?? []} />;
}
