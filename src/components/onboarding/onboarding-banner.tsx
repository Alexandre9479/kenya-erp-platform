"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnboardingState = {
  onboarding_completed: boolean;
  onboarding_step: number;
  onboarding_skipped: boolean;
};

const STORAGE_KEY = "onboarding_banner_dismissed_at";
const RESHOW_AFTER_MS = 1000 * 60 * 60 * 24; // 24h

function readInitialDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const at = Number(raw);
  return !Number.isNaN(at) && Date.now() - at < RESHOW_AFTER_MS;
}

export function OnboardingBanner({ role }: { role: string | undefined }) {
  const pathname = usePathname();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [dismissed, setDismissed] = useState(readInitialDismissed);

  const canSee = role === "tenant_admin" || role === "super_admin";

  useEffect(() => {
    if (!canSee) return;
    let cancelled = false;
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) return;
        setState({
          onboarding_completed: !!json.data.onboarding_completed,
          onboarding_step: Number(json.data.onboarding_step ?? 0),
          onboarding_skipped: !!json.data.onboarding_skipped,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canSee]);

  if (!canSee) return null;
  if (!state) return null;
  if (state.onboarding_completed) return null;
  if (dismissed) return null;
  if (pathname === "/onboarding") return null;

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setDismissed(true);
  };

  const pct = Math.round(((state.onboarding_step + 1) / 6) * 100);

  return (
    <div className="mb-4 relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-linear-to-r from-indigo-50 via-violet-50 to-fuchsia-50 p-4 sm:p-5 shadow-sm">
      <div className="pointer-events-none absolute -top-10 -right-6 w-40 h-40 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-md shrink-0">
          <Sparkles className="size-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            Finish setting up your workspace
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            Brand, localisation, banking and team invites — about 2 minutes to
            complete.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/70 overflow-hidden max-w-60">
              <div
                className="h-full bg-linear-to-r from-indigo-500 to-violet-600"
                style={{ width: `${Math.min(100, Math.max(10, pct))}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-indigo-700 tabular-nums">
              {Math.min(100, Math.max(10, pct))}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-linear-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm"
          >
            <Link href="/onboarding">
              Continue setup
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={dismiss}
            className="h-8 w-8"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
