// Phase 5 — full sidebar + header implementation
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — Phase 5 */}
      <aside className="w-64 bg-slate-900 flex-shrink-0" />
      <main className="flex-1 overflow-auto">
        {/* Header — Phase 5 */}
        <div className="h-16 border-b bg-white" />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
