// Super Admin layout — Phase 16
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-slate-950 flex-shrink-0" />
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="h-16 border-b bg-white" />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
