export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 py-12">
        {children}
      </div>
    </div>
  );
}
