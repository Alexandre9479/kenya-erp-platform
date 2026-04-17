import Link from "next/link";
import {
  Receipt,
  Banknote,
  FileCheck2,
  Building,
  Wallet,
  ReceiptText,
  ArrowUpRight,
} from "lucide-react";

type SubModule = {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  glow: string;
};

const SUB_MODULES: SubModule[] = [
  {
    href: "/expenses",
    title: "Expenses",
    description: "Track, approve and categorise expenses with VAT.",
    icon: Receipt,
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/30",
  },
  {
    href: "/reconciliation",
    title: "Bank Reconciliation",
    description: "Import statements, auto-match and resolve variances.",
    icon: Banknote,
    gradient: "from-sky-500 to-blue-600",
    glow: "shadow-sky-500/30",
  },
  {
    href: "/supplier-recon",
    title: "Supplier Reconciliation",
    description: "Reconcile supplier statements against bills and payments.",
    icon: FileCheck2,
    gradient: "from-cyan-500 to-teal-600",
    glow: "shadow-cyan-500/30",
  },
  {
    href: "/fixed-assets",
    title: "Fixed Assets",
    description: "Asset register, depreciation schedules and disposals.",
    icon: Building,
    gradient: "from-emerald-500 to-green-700",
    glow: "shadow-emerald-500/30",
  },
  {
    href: "/budgets",
    title: "Budgets",
    description: "Annual and monthly budgets with live variance vs actuals.",
    icon: Wallet,
    gradient: "from-fuchsia-500 to-pink-600",
    glow: "shadow-fuchsia-500/30",
  },
  {
    href: "/etims",
    title: "KRA eTIMS",
    description: "OSCU/VSCU device config and live invoice submissions.",
    icon: ReceiptText,
    gradient: "from-rose-500 to-red-600",
    glow: "shadow-rose-500/30",
  },
];

export function FinanceSuiteStrip() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Finance Suite</h2>
          <p className="mt-0.5 text-xs text-slate-400">Specialised tools that live inside Accounting</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SUB_MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-xl"
            >
              <div
                className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-linear-to-br ${m.gradient}`}
              />
              <div className="relative flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${m.gradient} shadow-md ${m.glow}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 transition-colors duration-300 group-hover:text-white truncate">
                      {m.title}
                    </h3>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-300 group-hover:text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500 transition-colors duration-300 group-hover:text-white/90 line-clamp-2">
                    {m.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
