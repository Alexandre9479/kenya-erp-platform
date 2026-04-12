import { Building2, TrendingUp, Package, Users, Calculator, ShoppingCart, BarChart3, CheckCircle2 } from "lucide-react";

const features = [
  { icon: ShoppingCart, label: "Invoicing & Sales" },
  { icon: Package, label: "Inventory Management" },
  { icon: Users, label: "HR & Payroll" },
  { icon: Calculator, label: "Double-Entry Accounting" },
  { icon: TrendingUp, label: "Real-time Reports" },
  { icon: BarChart3, label: "Business Analytics" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-[58%] relative overflow-hidden flex-col justify-between p-12 bg-linear-to-br from-indigo-700 via-violet-700 to-purple-800">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/25 shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-lg leading-none block">Kenya ERP</span>
              <span className="text-indigo-200 text-xs">Business Platform</span>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-5 tracking-tight">
            Run your entire<br />business from<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-300 to-amber-300">one platform.</span>
          </h1>
          <p className="text-indigo-100 text-base leading-relaxed max-w-md">
            Purpose-built for Kenyan enterprises. KRA-compliant invoicing, real-time inventory, automated payroll, and double-entry accounting — all connected.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="grid grid-cols-2 gap-2.5">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-white/10">
                <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm text-white/90 font-medium">{label}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15">
            <div className="flex gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-3.5 h-3.5 fill-yellow-300" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-white/90 text-sm italic leading-relaxed mb-3">&ldquo;Kenya ERP transformed how we manage our business. From invoicing to payroll — everything in one place.&rdquo;</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-400 flex items-center justify-center text-white text-xs font-bold">J</div>
              <div>
                <p className="text-white text-xs font-semibold">Jane Mwangi</p>
                <p className="text-indigo-200 text-xs">CEO, Acme Trading Ltd</p>
              </div>
            </div>
          </div>
          <div className="flex gap-10 pt-1">
            {[{ value: "500+", label: "Businesses" }, { value: "KES 2B+", label: "Revenue Managed" }, { value: "99.9%", label: "Uptime" }].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-indigo-200 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <div className="lg:hidden flex items-center gap-2.5 px-6 py-4 bg-linear-to-r from-indigo-600 to-violet-600 shadow-sm">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold">Kenya ERP Platform</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          {children}
        </div>
        <div className="text-center pb-6 text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>30-day free trial &middot; No credit card required</span>
          </div>
          <div>© {new Date().getFullYear()} Kenya ERP Platform. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
