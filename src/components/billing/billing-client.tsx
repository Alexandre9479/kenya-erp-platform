"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Crown,
  Sparkles,
  Check,
  Loader2,
  Smartphone,
  Calendar,
  ReceiptText,
  ArrowRight,
  ShieldCheck,
  Clock,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_annual: number;
  currency_code: string;
  trial_days: number;
  max_users: number | null;
  max_invoices_per_mo: number | null;
  features: string[];
  is_public: boolean;
  is_active: boolean;
};

type Tenant = {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  plan_id: string | null;
  billing_cycle: "monthly" | "annual";
  billing_phone: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type SubInvoice = {
  id: string;
  invoice_number: string;
  billing_cycle: "monthly" | "annual";
  period_start: string;
  period_end: string;
  amount: number;
  currency_code: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  payhero_receipt: string | null;
  paid_at: string | null;
  failure_reason: string | null;
  created_at: string;
};

type Subscription = {
  tenant: Tenant;
  plan: Plan | null;
  invoices: SubInvoice[];
};

const STATUS_STYLE: Record<
  SubInvoice["status"],
  { label: string; chip: string; dot: string }
> = {
  paid: {
    label: "Paid",
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    chip: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  failed: {
    label: "Failed",
    chip: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  cancelled: {
    label: "Cancelled",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  refunded: {
    label: "Refunded",
    chip: "bg-indigo-100 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
};

function kes(n: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function BillingClient({
  initialPlans,
  initialSubscription,
}: {
  initialPlans: Plan[];
  initialSubscription: Subscription;
}) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [sub, setSub] = useState<Subscription | null>(initialSubscription);
  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "annual">(
    initialSubscription?.tenant?.billing_cycle ?? "monthly"
  );
  const [picked, setPicked] = useState<Plan | null>(null);
  const [phone, setPhone] = useState(
    initialSubscription?.tenant?.billing_phone ?? ""
  );
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        fetch("/api/billing/plans").then((r) => r.json()),
        fetch("/api/billing/subscription").then((r) => r.json()),
      ]);
      setPlans(p.data ?? []);
      setSub(s.data ?? null);
    } catch {
      toast.error("Could not load billing");
    }
    setLoading(false);
  }

  const currentPlan = sub?.plan ?? null;
  const tenant = sub?.tenant ?? null;
  const invoices = sub?.invoices ?? [];

  const trialLeft = useMemo(
    () => daysUntil(tenant?.trial_ends_at ?? null),
    [tenant?.trial_ends_at]
  );
  const periodLeft = useMemo(
    () => daysUntil(tenant?.current_period_end ?? null),
    [tenant?.current_period_end]
  );

  const lastPaid = invoices.find((i) => i.status === "paid") ?? null;
  const pendingInv = invoices.find((i) => i.status === "pending") ?? null;

  async function submit() {
    if (!picked) return;
    if (!phone.trim()) {
      toast.error("Enter an M-Pesa phone number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_code: picked.code,
          billing_cycle: cycle,
          phone: phone.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Payment failed");
        setSubmitting(false);
        return;
      }
      if (json.data?.activated) {
        toast.success(`Activated ${picked.name} (trial)`);
      } else {
        toast.success("Check your phone — STK push sent");
      }
      setPicked(null);
      setSubmitting(false);
      await load();
    } catch {
      toast.error("Network error");
      setSubmitting(false);
    }
  }

  const statusTag = (() => {
    const s = tenant?.subscription_status;
    if (!s) return null;
    if (s === "active")
      return { label: "Active", chip: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: ShieldCheck };
    if (s === "trial")
      return { label: "Trial", chip: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Clock };
    if (s === "past_due")
      return { label: "Past due", chip: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle };
    if (s === "cancelled")
      return { label: "Cancelled", chip: "bg-slate-100 text-slate-600 border-slate-200", icon: XCircle };
    return { label: s, chip: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock };
  })();
  const StatusIcon = statusTag?.icon ?? ShieldCheck;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-linear-to-br from-amber-900 via-orange-800 to-rose-700 p-6 sm:p-8 shadow-xl">
        <div className="pointer-events-none absolute -top-24 -right-20 w-80 h-80 rounded-full bg-amber-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-rose-500/30 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white/90 border border-white/20">
              <Crown className="size-3.5" />
              Billing & plans
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {currentPlan ? currentPlan.name : "Choose your plan"}
            </h1>
            <p className="mt-1.5 text-sm text-white/80 max-w-2xl">
              Pay securely with M-Pesa via PayHero. Cancel or change plans any
              time.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void load()}
              className="gap-1.5 bg-white/15 text-white hover:bg-white/25 border border-white/20"
            >
              <RefreshCcw className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <HeroStat
            icon={Crown}
            label="Current plan"
            value={currentPlan?.name ?? "—"}
            sub={
              statusTag ? (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusTag.chip}`}>
                  <StatusIcon className="size-3" />
                  {statusTag.label}
                </span>
              ) : null
            }
          />
          <HeroStat
            icon={TrendingUp}
            label="Billing cycle"
            value={tenant?.billing_cycle === "annual" ? "Annual" : "Monthly"}
            sub={tenant?.cancel_at_period_end ? "Ends at period close" : "Auto-renews"}
          />
          <HeroStat
            icon={Calendar}
            label={tenant?.subscription_status === "trial" ? "Trial ends" : "Next renewal"}
            value={
              tenant?.subscription_status === "trial"
                ? formatDate(tenant?.trial_ends_at ?? null)
                : formatDate(tenant?.current_period_end ?? null)
            }
            sub={
              tenant?.subscription_status === "trial"
                ? trialLeft != null
                  ? `${Math.max(0, trialLeft)} day${trialLeft === 1 ? "" : "s"} left`
                  : null
                : periodLeft != null && periodLeft >= 0
                  ? `${periodLeft} day${periodLeft === 1 ? "" : "s"} left`
                  : null
            }
          />
          <HeroStat
            icon={CircleDollarSign}
            label="Last payment"
            value={lastPaid ? kes(Number(lastPaid.amount)) : "—"}
            sub={lastPaid ? formatDate(lastPaid.paid_at) : "No payments yet"}
          />
        </div>
      </div>

      {pendingInv && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
            <Clock className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">
              Payment in progress
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Invoice <span className="font-mono">{pendingInv.invoice_number}</span>{" "}
              — {kes(Number(pendingInv.amount))}. Check your phone for the
              M-Pesa prompt.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Refresh status
          </Button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            Plans
          </h2>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`rounded-lg px-3 py-1 font-medium transition ${
                cycle === "monthly"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("annual")}
              className={`rounded-lg px-3 py-1 font-medium transition inline-flex items-center gap-1.5 ${
                cycle === "annual"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Annual
              <span className="rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold">
                -2 mo
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-2xl border border-slate-200 bg-white animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans
              .filter((p) => p.is_public && p.code !== "enterprise")
              .map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  cycle={cycle}
                  isCurrent={tenant?.plan_id === p.id}
                  onPick={() => setPicked(p)}
                />
              ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-800 p-5 text-white flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
            <Crown className="size-5 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Need Enterprise?</p>
            <p className="text-xs text-white/70 mt-0.5">
              Custom deployments, SSO, bespoke SLAs and dedicated infrastructure.
              Let&apos;s talk.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="bg-white text-slate-900 hover:bg-white/90"
          >
            <a href="mailto:sales@example.com?subject=Enterprise%20plan">
              Contact sales
              <ArrowRight className="ml-1.5 size-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/80 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500" />
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ReceiptText className="size-4 text-slate-500" />
                Payment history
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Last {Math.min(24, invoices.length)} subscription charges
              </p>
            </div>
          </div>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-slate-100">
                <ReceiptText className="size-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">
                No payments yet
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick a plan above to get started
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Invoice</TableHead>
                    <TableHead className="text-[11px]">Period</TableHead>
                    <TableHead className="text-[11px]">Cycle</TableHead>
                    <TableHead className="text-[11px] text-right">Amount</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((i) => {
                    const s = STATUS_STYLE[i.status];
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs font-mono text-slate-700">
                          {i.invoice_number}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 tabular-nums">
                          {formatDate(i.period_start)} →{" "}
                          {formatDate(i.period_end)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 capitalize">
                          {i.billing_cycle}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900 tabular-nums text-right">
                          {kes(Number(i.amount))}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.chip}`}
                          >
                            <span className={`size-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {i.payhero_receipt ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-rose-500 text-white">
                <Crown className="size-4" />
              </div>
              Subscribe to {picked?.name}
            </SheetTitle>
            <SheetDescription>
              {picked?.code === "trial"
                ? "Start a free trial — no payment required."
                : "We'll send an M-Pesa prompt to the phone number below."}
            </SheetDescription>
          </SheetHeader>

          {picked && (
            <div className="mt-4 space-y-4 px-4 pb-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {cycle === "annual" ? "Annual" : "Monthly"} charge
                  </span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">
                    {picked.code === "trial"
                      ? "Free"
                      : kes(
                          cycle === "annual"
                            ? Number(picked.price_annual)
                            : Number(picked.price_monthly)
                        )}
                  </span>
                </div>
                {picked.code !== "trial" && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Billed {cycle === "annual" ? "once per year" : "every month"}{" "}
                    via M-Pesa • KES
                  </p>
                )}
              </div>

              <Separator />

              {picked.code !== "trial" && (
                <div>
                  <Label htmlFor="phone" className="text-xs">
                    M-Pesa phone number
                  </Label>
                  <div className="relative mt-1">
                    <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXX XXX or 2547XXXXXXXX"
                      className="pl-8"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    You&apos;ll receive a prompt on this number. Enter your
                    M-Pesa PIN to confirm.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                  Includes
                </p>
                <ul className="mt-2 space-y-1.5">
                  {picked.features.slice(0, 6).map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={submit}
                disabled={submitting || (picked.code !== "trial" && !phone.trim())}
                className="w-full gap-1.5 bg-linear-to-br from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {picked.code === "trial" ? "Activating…" : "Sending prompt…"}
                  </>
                ) : (
                  <>
                    {picked.code === "trial"
                      ? "Start free trial"
                      : `Pay ${kes(cycle === "annual" ? Number(picked.price_annual) : Number(picked.price_monthly))}`}
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-slate-500 text-center">
                Secure payment by PayHero. You can change or cancel any time.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-white/90 to-white/60 text-amber-900 shrink-0 shadow-sm">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-white/70">
            {label}
          </p>
          <p className="text-base font-bold text-white mt-0.5 truncate">
            {value}
          </p>
          {sub && <div className="text-[11px] text-white/70 mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  cycle,
  isCurrent,
  onPick,
}: {
  plan: Plan;
  cycle: "monthly" | "annual";
  isCurrent: boolean;
  onPick: () => void;
}) {
  const featured = plan.code === "growth";
  const price =
    cycle === "annual" ? Number(plan.price_annual) : Number(plan.price_monthly);
  const period = cycle === "annual" ? "/ year" : "/ month";

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col ${
        featured
          ? "border-amber-300 bg-linear-to-br from-amber-50 via-orange-50 to-rose-50 shadow-xl"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      {featured && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-linear-to-r from-amber-500 to-rose-500 text-white border-0 shadow-md gap-1 text-[10px]">
            <Sparkles className="size-3" />
            Most popular
          </Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
            <CheckCircle2 className="size-3" />
            Current
          </span>
        </div>
      )}

      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
          {plan.description ?? ""}
        </p>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-slate-900 tabular-nums">
          {plan.code === "trial" ? "Free" : kes(price)}
        </span>
        {plan.code !== "trial" && (
          <span className="text-xs text-slate-500">{period}</span>
        )}
      </div>

      {plan.trial_days > 0 && (
        <p className="text-[11px] text-indigo-700 font-medium mt-1">
          {plan.trial_days}-day free trial
        </p>
      )}

      <Separator className="my-3" />

      <ul className="space-y-1.5 mb-4 flex-1">
        {plan.features.slice(0, 6).map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
            <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        onClick={onPick}
        variant={featured ? "default" : "outline"}
        className={`w-full ${
          featured
            ? "bg-linear-to-br from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white"
            : ""
        }`}
        disabled={isCurrent}
      >
        {isCurrent
          ? "Current plan"
          : plan.code === "trial"
            ? "Start trial"
            : "Choose plan"}
      </Button>
    </div>
  );
}
