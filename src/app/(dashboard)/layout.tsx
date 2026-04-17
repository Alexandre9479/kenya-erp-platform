export const dynamic = "force-dynamic";

import AppHeader from "@/components/layout/app-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
