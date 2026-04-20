import * as React from "react";
import { cn } from "@/lib/utils";

type HeroGradient =
  | "indigo"
  | "emerald"
  | "sky"
  | "amber"
  | "rose"
  | "violet"
  | "slate"
  | "teal"
  | "orange"
  | "cyan"
  | "fuchsia"
  | "blue";

const GRADIENTS: Record<HeroGradient, { bg: string; borderColor: string; orb1: string; orb2: string; iconBg: string; iconText: string }> = {
  indigo:  { bg: "from-indigo-900 via-violet-800 to-purple-800",     borderColor: "border-indigo-200/60", orb1: "bg-violet-400/30",  orb2: "bg-indigo-500/30",  iconBg: "from-white/90 to-white/60", iconText: "text-indigo-900" },
  emerald: { bg: "from-emerald-900 via-teal-800 to-cyan-800",         borderColor: "border-emerald-200/60", orb1: "bg-teal-400/30",    orb2: "bg-emerald-500/30", iconBg: "from-white/90 to-white/60", iconText: "text-emerald-900" },
  sky:     { bg: "from-sky-900 via-blue-800 to-indigo-800",           borderColor: "border-sky-200/60",   orb1: "bg-blue-400/30",    orb2: "bg-sky-500/30",     iconBg: "from-white/90 to-white/60", iconText: "text-sky-900" },
  amber:   { bg: "from-amber-900 via-orange-800 to-rose-700",         borderColor: "border-amber-200/60", orb1: "bg-amber-400/30",   orb2: "bg-rose-500/30",    iconBg: "from-white/90 to-white/60", iconText: "text-amber-900" },
  rose:    { bg: "from-rose-900 via-pink-800 to-fuchsia-700",         borderColor: "border-rose-200/60",  orb1: "bg-pink-400/30",    orb2: "bg-fuchsia-500/30", iconBg: "from-white/90 to-white/60", iconText: "text-rose-900" },
  violet:  { bg: "from-violet-900 via-purple-800 to-fuchsia-700",     borderColor: "border-violet-200/60", orb1: "bg-fuchsia-400/30", orb2: "bg-indigo-500/30",  iconBg: "from-white/90 to-white/60", iconText: "text-violet-900" },
  slate:   { bg: "from-slate-900 via-slate-800 to-slate-700",         borderColor: "border-slate-200/60", orb1: "bg-slate-400/30",   orb2: "bg-slate-500/30",   iconBg: "from-white/90 to-white/60", iconText: "text-slate-900" },
  teal:    { bg: "from-teal-900 via-emerald-800 to-green-700",        borderColor: "border-teal-200/60",  orb1: "bg-emerald-400/30", orb2: "bg-teal-500/30",    iconBg: "from-white/90 to-white/60", iconText: "text-teal-900" },
  orange:  { bg: "from-orange-900 via-red-800 to-rose-700",           borderColor: "border-orange-200/60", orb1: "bg-orange-400/30", orb2: "bg-red-500/30",     iconBg: "from-white/90 to-white/60", iconText: "text-orange-900" },
  cyan:    { bg: "from-cyan-900 via-sky-800 to-blue-800",             borderColor: "border-cyan-200/60",  orb1: "bg-sky-400/30",     orb2: "bg-cyan-500/30",    iconBg: "from-white/90 to-white/60", iconText: "text-cyan-900" },
  fuchsia: { bg: "from-fuchsia-900 via-pink-800 to-rose-700",         borderColor: "border-fuchsia-200/60", orb1: "bg-pink-400/30", orb2: "bg-fuchsia-500/30", iconBg: "from-white/90 to-white/60", iconText: "text-fuchsia-900" },
  blue:    { bg: "from-blue-900 via-indigo-800 to-violet-800",        borderColor: "border-blue-200/60",  orb1: "bg-indigo-400/30",  orb2: "bg-blue-500/30",    iconBg: "from-white/90 to-white/60", iconText: "text-blue-900" },
};

export function PremiumHero({
  gradient = "indigo",
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  gradient?: HeroGradient;
  icon?: React.ElementType;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const g = GRADIENTS[gradient];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl sm:rounded-3xl border shadow-xl p-4 sm:p-6 md:p-8 bg-linear-to-br",
        g.borderColor,
        g.bg,
        className
      )}
    >
      <div className={cn("pointer-events-none absolute -top-20 -right-16 w-60 sm:w-80 h-60 sm:h-80 rounded-full blur-3xl", g.orb1)} />
      <div className={cn("pointer-events-none absolute -bottom-20 -left-16 w-56 sm:w-72 h-56 sm:h-72 rounded-full blur-3xl", g.orb2)} />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-1 text-[11px] sm:text-xs font-medium text-white/90 border border-white/20">
              {eyebrow}
            </div>
          )}
          <div className="mt-2 sm:mt-3 flex items-center gap-3">
            {Icon && (
              <div className={cn("hidden sm:flex size-10 items-center justify-center rounded-xl shrink-0 shadow-md bg-linear-to-br", g.iconBg)}>
                <Icon className={cn("size-5", g.iconText)} />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white truncate">
              {title}
            </h1>
          </div>
          {description && (
            <p className="mt-1.5 text-[13px] sm:text-sm text-white/80 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="relative mt-4 sm:mt-6">{children}</div>}
    </div>
  );
}

export function HeroStatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function HeroStat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const chip =
    accent === "success"
      ? "from-emerald-200 to-emerald-50 text-emerald-900"
      : accent === "warning"
        ? "from-amber-200 to-amber-50 text-amber-900"
        : accent === "danger"
          ? "from-rose-200 to-rose-50 text-rose-900"
          : accent === "info"
            ? "from-sky-200 to-sky-50 text-sky-900"
            : "from-white/90 to-white/60 text-slate-900";

  return (
    <div className="rounded-xl sm:rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-3 sm:p-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={cn("flex size-8 sm:size-9 items-center justify-center rounded-lg sm:rounded-xl shrink-0 shadow-sm bg-linear-to-br", chip)}>
          <Icon className="size-3.5 sm:size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wide font-semibold text-white/70">
            {label}
          </p>
          <p className="text-sm sm:text-base font-bold text-white mt-0.5 truncate tabular-nums">
            {value}
          </p>
          {sub && <div className="text-[10px] sm:text-[11px] text-white/70 mt-0.5 truncate">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function HeroPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const map = {
    default: "bg-white/15 text-white border-white/20",
    success: "bg-emerald-400/25 text-white border-emerald-200/40",
    warning: "bg-amber-400/25 text-white border-amber-200/40",
    danger: "bg-rose-400/25 text-white border-rose-200/40",
    info: "bg-sky-400/25 text-white border-sky-200/40",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium backdrop-blur-sm", map[tone])}>
      {children}
    </span>
  );
}

export function SectionCard({
  accent = "indigo",
  children,
  className,
}: {
  accent?: HeroGradient;
  children: React.ReactNode;
  className?: string;
}) {
  const g = GRADIENTS[accent];
  return (
    <div className={cn("relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-linear-to-r", g.bg)} />
      <div className="relative p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-slate-100 to-slate-50 border border-slate-200">
        <Icon className="size-6 text-slate-400" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusDot({ tone = "default" }: { tone?: "default" | "success" | "warning" | "danger" | "info" | "muted" }) {
  const map = {
    default: "bg-indigo-500",
    success: "bg-emerald-500 animate-pulse",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-sky-500",
    muted: "bg-slate-300",
  };
  return <span className={cn("inline-block size-1.5 rounded-full shrink-0", map[tone])} />;
}
