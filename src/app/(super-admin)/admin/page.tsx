import type { Metadata } from "next";
export const metadata: Metadata = { title: "Super Admin" };
export default function SuperAdminPage() {
  return <div><h1 className="text-2xl font-bold text-slate-900">Super Admin Panel</h1><p className="text-slate-500 mt-1">Full implementation in Phase 16.</p></div>;
}
