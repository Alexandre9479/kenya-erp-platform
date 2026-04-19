"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  Building2,
  Globe,
  Landmark,
  Warehouse as WarehouseIcon,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Trash2,
  Mail,
  PartyPopper,
  Rocket,
  SkipForward,
  Info,
  Palette,
  MapPin,
  Phone,
  Hash,
  Copy,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  kra_pin: string | null;
  logo_url: string | null;
  primary_color: string;
  currency: string;
  timezone: string;
  bank_name: string | null;
  bank_account: string | null;
  bank_branch: string | null;
  invoice_prefix: string;
  quote_prefix: string;
  lpo_prefix: string;
  receipt_prefix: string | null;
  grn_prefix: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  onboarding_skipped: boolean;
};

type Warehouse = {
  id: string;
  name: string;
  location: string | null;
  is_default: boolean;
  is_active: boolean;
};

// ─── Step definitions ───────────────────────────────────────────────────────

const STEPS = [
  {
    key: "brand",
    label: "Brand",
    short: "Brand your workspace",
    description:
      "Give your company identity — logo, address and contact info appear on every document you send.",
    icon: Building2,
  },
  {
    key: "localisation",
    label: "Localisation",
    short: "Currency & timezone",
    description:
      "Confirm the currency you invoice in and the timezone your team works in.",
    icon: Globe,
  },
  {
    key: "banking",
    label: "Banking",
    short: "Add bank details",
    description:
      "Where should customers pay you? Bank info prints on invoices and receipts.",
    icon: Landmark,
  },
  {
    key: "warehouses",
    label: "Warehouses",
    short: "Stock locations",
    description:
      "Main warehouse is already set up. Add branches or shops if you keep stock elsewhere.",
    icon: WarehouseIcon,
  },
  {
    key: "team",
    label: "Invite team",
    short: "Bring teammates in",
    description:
      "Invite colleagues so they can log in with the right permissions. You can always add more later.",
    icon: UserPlus,
  },
  {
    key: "done",
    label: "Ready",
    short: "You're all set",
    description: "Launch into the ERP with a tour of what's next.",
    icon: PartyPopper,
  },
] as const;

const CURRENCIES = [
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "UGX", label: "UGX — Ugandan Shilling" },
  { value: "TZS", label: "TZS — Tanzanian Shilling" },
  { value: "RWF", label: "RWF — Rwandan Franc" },
];

const TIMEZONES = [
  "Africa/Nairobi",
  "Africa/Dar_es_Salaam",
  "Africa/Kampala",
  "Africa/Kigali",
  "Africa/Mogadishu",
  "UTC",
  "Europe/London",
  "America/New_York",
];

const ROLE_OPTIONS = [
  { value: "tenant_admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "sales", label: "Sales" },
  { value: "purchasing", label: "Purchasing" },
  { value: "warehouse", label: "Warehouse" },
  { value: "hr", label: "HR" },
  { value: "viewer", label: "Viewer" },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function StepRail({
  current,
  onJump,
}: {
  current: number;
  onJump: (idx: number) => void;
}) {
  return (
    <nav className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-24 space-y-1">
        {STEPS.map((s, i) => {
          const done = current > i;
          const active = current === i;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => (done ? onJump(i) : undefined)}
              disabled={!done && !active}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                active && "bg-white border border-indigo-200 shadow-sm",
                done && !active && "hover:bg-white/60 cursor-pointer",
                !done && !active && "opacity-60 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors",
                  done &&
                    !active &&
                    "bg-linear-to-br from-emerald-500 to-emerald-600 text-white",
                  active &&
                    "bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md",
                  !done && !active && "bg-slate-100 text-slate-400"
                )}
              >
                {done && !active ? (
                  <Check className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-sm font-medium leading-tight truncate",
                    active ? "text-slate-900" : "text-slate-600"
                  )}
                >
                  {s.label}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Step {i + 1} of {STEPS.length}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function StepHeader({ idx }: { idx: number }) {
  const s = STEPS[idx]!;
  const Icon = s.icon;
  return (
    <div className="flex items-start gap-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-md shrink-0">
        <Icon className="size-5 text-white" />
      </div>
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-700">
          Step {idx + 1} of {STEPS.length}
        </span>
        <h2 className="mt-1.5 text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
          {s.short}
        </h2>
        <p className="mt-1 text-sm text-slate-500 max-w-xl">{s.description}</p>
      </div>
    </div>
  );
}

function StepProgress({ current }: { current: number }) {
  const pct = Math.round(((current + 1) / STEPS.length) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-indigo-500 to-violet-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function OnboardingClient({
  tenant,
  initialWarehouses,
}: {
  tenant: Tenant;
  initialWarehouses: Warehouse[];
}) {
  const router = useRouter();
  const startIdx = Math.min(
    Math.max(0, tenant.onboarding_step ?? 0),
    STEPS.length - 1
  );
  const [stepIdx, setStepIdx] = useState(startIdx);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // Step 1 — brand
  const [brand, setBrand] = useState({
    name: tenant.name,
    phone: tenant.phone ?? "",
    address: tenant.address ?? "",
    city: tenant.city ?? "",
    kra_pin: tenant.kra_pin ?? "",
    primary_color: tenant.primary_color || "#3b82f6",
  });

  // Step 2 — localisation
  const [loc, setLoc] = useState({
    currency: tenant.currency || "KES",
    timezone: tenant.timezone || "Africa/Nairobi",
    invoice_prefix: tenant.invoice_prefix || "INV",
    quote_prefix: tenant.quote_prefix || "QUO",
    receipt_prefix: tenant.receipt_prefix ?? "REC",
  });

  // Step 3 — banking
  const [bank, setBank] = useState({
    bank_name: tenant.bank_name ?? "",
    bank_account: tenant.bank_account ?? "",
    bank_branch: tenant.bank_branch ?? "",
  });

  // Step 4 — warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    location: "",
  });
  const [addingWh, setAddingWh] = useState(false);

  // Step 5 — team invites
  type Invite = { email: string; full_name: string; role: string };
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteDraft, setInviteDraft] = useState<Invite>({
    email: "",
    full_name: "",
    role: "sales",
  });
  const [sendingInvites, setSendingInvites] = useState(false);

  // ─── Helpers ────────────────────────────────────────────────────────────

  const currentStep = STEPS[stepIdx]!;

  const brandValid = useMemo(
    () => brand.name.trim().length >= 2,
    [brand.name]
  );
  const locValid = useMemo(
    () =>
      loc.currency.length === 3 &&
      loc.timezone.length > 0 &&
      loc.invoice_prefix.length >= 1 &&
      loc.quote_prefix.length >= 1,
    [loc]
  );

  const patchTenant = async (patch: Record<string, unknown>) => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(json.error ?? "Could not save changes");
    }
    return res.json();
  };

  const saveOnboardingStep = async (nextStep: number) => {
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: nextStep }),
    });
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      if (currentStep.key === "brand") {
        if (!brandValid) {
          toast.error("Please give your company a name");
          return;
        }
        await patchTenant({
          name: brand.name.trim(),
          phone: brand.phone || null,
          address: brand.address || null,
          city: brand.city || null,
          kra_pin: brand.kra_pin || null,
        });
      } else if (currentStep.key === "localisation") {
        if (!locValid) {
          toast.error("Please complete all fields");
          return;
        }
        await patchTenant({
          currency: loc.currency,
          timezone: loc.timezone,
          invoice_prefix: loc.invoice_prefix.toUpperCase(),
          quote_prefix: loc.quote_prefix.toUpperCase(),
          receipt_prefix: loc.receipt_prefix.toUpperCase(),
        });
      } else if (currentStep.key === "banking") {
        await patchTenant({
          bank_name: bank.bank_name || null,
          bank_account: bank.bank_account || null,
          bank_branch: bank.bank_branch || null,
        });
      }
      const next = stepIdx + 1;
      await saveOnboardingStep(next);
      setStepIdx(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setStepIdx(Math.max(0, stepIdx - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJump = (idx: number) => {
    if (idx <= stepIdx) {
      setStepIdx(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const addWarehouse = async () => {
    if (!newWarehouse.name.trim()) {
      toast.error("Warehouse name is required");
      return;
    }
    setAddingWh(true);
    try {
      const res = await fetch("/api/onboarding/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWarehouse.name.trim(),
          location: newWarehouse.location.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        data?: Warehouse;
        error?: string;
      };
      if (!res.ok || !json.data) {
        toast.error(json.error ?? "Could not add warehouse");
        return;
      }
      setWarehouses((prev) => [...prev, json.data!]);
      setNewWarehouse({ name: "", location: "" });
      toast.success(`Added ${json.data.name}`);
    } finally {
      setAddingWh(false);
    }
  };

  const queueInvite = () => {
    const email = inviteDraft.email.trim().toLowerCase();
    const full_name = inviteDraft.full_name.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    if (!full_name) {
      toast.error("Enter a full name");
      return;
    }
    if (invites.some((i) => i.email === email)) {
      toast.error("This email is already queued");
      return;
    }
    setInvites((prev) => [
      ...prev,
      { email, full_name, role: inviteDraft.role },
    ]);
    setInviteDraft({ email: "", full_name: "", role: inviteDraft.role });
  };

  const removeInvite = (email: string) =>
    setInvites((prev) => prev.filter((i) => i.email !== email));

  const sendInvites = async () => {
    if (invites.length === 0) return;
    setSendingInvites(true);
    const tmpPwd = () =>
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).toUpperCase().slice(2, 4) +
      "!2";
    let ok = 0;
    let failed = 0;
    for (const inv of invites) {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inv.email,
            full_name: inv.full_name,
            role: inv.role,
            password: tmpPwd(),
          }),
        });
        if (res.ok) ok += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    setSendingInvites(false);
    if (ok > 0) toast.success(`Invited ${ok} teammate${ok === 1 ? "" : "s"}`);
    if (failed > 0)
      toast.error(
        `${failed} invite${failed === 1 ? "" : "s"} could not be created`
      );
    setInvites([]);
  };

  const finishOnboarding = async () => {
    setFinishing(true);
    try {
      if (invites.length > 0) {
        await sendInvites();
      }
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, step: STEPS.length }),
      });
      toast.success("Workspace ready");
      router.push("/apps");
      router.refresh();
    } catch {
      toast.error("Could not finalise setup");
    } finally {
      setFinishing(false);
    }
  };

  const skipOnboarding = async () => {
    setSkipping(true);
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipped: true, completed: true }),
      });
      router.push("/apps");
      router.refresh();
    } finally {
      setSkipping(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 px-6 py-7 sm:px-8 sm:py-9 text-white shadow-xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #1e1b4b 0%, #4338ca 45%, #7c3aed 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-20 -right-16 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/80 backdrop-blur">
                <Sparkles className="size-3" />
                Welcome to {tenant.name}
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
                Let&apos;s get your workspace ready
              </h1>
              <p className="mt-1.5 text-sm text-white/75 max-w-xl">
                A few quick steps — brand, localise, connect a bank, invite
                your team. Takes about two minutes.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={skipOnboarding}
              disabled={skipping || finishing}
              className="gap-1.5 bg-white/10 border-white/25 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              {skipping ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <SkipForward className="size-3.5" />
              )}
              Skip for now
            </Button>
          </div>

          <StepProgress current={stepIdx} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row gap-6">
        <StepRail current={stepIdx} onJump={handleJump} />

        <Card className="relative overflow-hidden border-slate-200/80 shadow-sm flex-1">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-indigo-400/60 via-violet-400/60 to-fuchsia-400/60" />

          <CardContent className="p-5 sm:p-7 flex flex-col gap-6">
            <StepHeader idx={stepIdx} />
            <Separator />

            {/* Step 1 — brand */}
            {currentStep.key === "brand" && (
              <div className="grid gap-5">
                <div className="grid gap-1.5">
                  <Label>
                    Company name <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      value={brand.name}
                      onChange={(e) =>
                        setBrand({ ...brand, name: e.target.value })
                      }
                      placeholder="Acme Trading Ltd"
                      className="pl-9"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label>Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <Input
                        value={brand.phone}
                        onChange={(e) =>
                          setBrand({ ...brand, phone: e.target.value })
                        }
                        placeholder="+254 700 000 000"
                        className="pl-9"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>KRA PIN</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <Input
                        value={brand.kra_pin}
                        onChange={(e) =>
                          setBrand({ ...brand, kra_pin: e.target.value })
                        }
                        placeholder="A001XXXXX"
                        className="pl-9 uppercase tabular-nums"
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-[1fr_200px] gap-4">
                  <div className="grid gap-1.5">
                    <Label>Street address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <Input
                        value={brand.address}
                        onChange={(e) =>
                          setBrand({ ...brand, address: e.target.value })
                        }
                        placeholder="Moi Avenue, 5th floor"
                        className="pl-9"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>City</Label>
                    <Input
                      value={brand.city}
                      onChange={(e) =>
                        setBrand({ ...brand, city: e.target.value })
                      }
                      placeholder="Nairobi"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Palette className="size-3.5 text-slate-400" />
                    Brand colour
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={brand.primary_color}
                        onChange={(e) =>
                          setBrand({
                            ...brand,
                            primary_color: e.target.value,
                          })
                        }
                        className="h-10 w-12 rounded-md border border-slate-200 cursor-pointer p-1"
                        disabled={saving}
                      />
                    </div>
                    <Input
                      value={brand.primary_color}
                      onChange={(e) =>
                        setBrand({
                          ...brand,
                          primary_color: e.target.value,
                        })
                      }
                      placeholder="#3b82f6"
                      className="max-w-35 font-mono tabular-nums"
                      disabled={saving}
                    />
                    <div
                      className="h-10 flex-1 rounded-md border border-slate-200 flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: brand.primary_color }}
                    >
                      Preview
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Used on invoices, quotes and customer portals.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2 — localisation */}
            {currentStep.key === "localisation" && (
              <div className="grid gap-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label>Base currency</Label>
                    <Select
                      value={loc.currency}
                      onValueChange={(v) => setLoc({ ...loc, currency: v })}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Timezone</Label>
                    <Select
                      value={loc.timezone}
                      onValueChange={(v) => setLoc({ ...loc, timezone: v })}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-800">
                    Document prefixes
                  </Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Numbers auto-increment. Use 2–6 letters per prefix.
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        key: "invoice_prefix" as const,
                        label: "Invoice",
                        sample: (loc.invoice_prefix || "INV") + "-0001",
                      },
                      {
                        key: "quote_prefix" as const,
                        label: "Quote",
                        sample: (loc.quote_prefix || "QUO") + "-0001",
                      },
                      {
                        key: "receipt_prefix" as const,
                        label: "Receipt",
                        sample: (loc.receipt_prefix || "REC") + "-0001",
                      },
                    ].map((f) => (
                      <div
                        key={f.key}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 flex flex-col gap-1.5"
                      >
                        <Label className="text-xs text-slate-600">
                          {f.label}
                        </Label>
                        <Input
                          value={loc[f.key] ?? ""}
                          onChange={(e) =>
                            setLoc({
                              ...loc,
                              [f.key]: e.target.value.toUpperCase(),
                            })
                          }
                          className="h-8 text-xs font-mono bg-white"
                          maxLength={6}
                          disabled={saving}
                        />
                        <p className="text-[10px] font-mono text-slate-500 tabular-nums">
                          e.g. {f.sample}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 flex gap-2.5">
                  <Info className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    Default VAT (16%) is pre-configured on products. You can
                    adjust it per product later under Inventory.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3 — banking */}
            {currentStep.key === "banking" && (
              <div className="grid gap-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label>Bank name</Label>
                    <div className="relative">
                      <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <Input
                        value={bank.bank_name}
                        onChange={(e) =>
                          setBank({ ...bank, bank_name: e.target.value })
                        }
                        placeholder="Equity Bank"
                        className="pl-9"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Branch</Label>
                    <Input
                      value={bank.bank_branch}
                      onChange={(e) =>
                        setBank({ ...bank, bank_branch: e.target.value })
                      }
                      placeholder="Westlands"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Account number</Label>
                  <Input
                    value={bank.bank_account}
                    onChange={(e) =>
                      setBank({ ...bank, bank_account: e.target.value })
                    }
                    placeholder="0123456789"
                    className="font-mono tabular-nums"
                    disabled={saving}
                  />
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 flex gap-2.5">
                  <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    These details print on invoices so customers know where to
                    pay. You can add multiple bank accounts later under
                    Settings → Payment channels.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4 — warehouses */}
            {currentStep.key === "warehouses" && (
              <div className="grid gap-5">
                <div className="grid gap-2">
                  {warehouses.length === 0 ? (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-6 text-center">
                      <div className="mx-auto flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200">
                        <WarehouseIcon className="size-4 text-slate-400" />
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        No warehouses yet
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add at least one to track stock.
                      </p>
                    </div>
                  ) : (
                    warehouses.map((w) => (
                      <div
                        key={w.id}
                        className="rounded-xl border border-slate-200/80 bg-white p-3 flex items-center gap-3"
                      >
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-br from-orange-500 to-amber-600 shrink-0">
                          <WarehouseIcon className="size-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {w.name}
                            </p>
                            {w.is_default && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] gap-0.5"
                              >
                                <Star className="size-2.5 fill-amber-500 text-amber-500" />
                                Default
                              </Badge>
                            )}
                          </div>
                          {w.location && (
                            <p className="text-xs text-slate-500 truncate">
                              {w.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                <div className="grid gap-3">
                  <Label className="text-sm font-medium text-slate-800">
                    Add another warehouse
                  </Label>
                  <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      value={newWarehouse.name}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g. Mombasa Branch"
                      disabled={addingWh}
                    />
                    <Input
                      value={newWarehouse.location}
                      onChange={(e) =>
                        setNewWarehouse({
                          ...newWarehouse,
                          location: e.target.value,
                        })
                      }
                      placeholder="Location (optional)"
                      disabled={addingWh}
                    />
                    <Button
                      onClick={addWarehouse}
                      disabled={addingWh || !newWarehouse.name.trim()}
                      className="gap-1.5"
                    >
                      {addingWh ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5 — team */}
            {currentStep.key === "team" && (
              <div className="grid gap-5">
                <div className="grid gap-3">
                  <div className="grid sm:grid-cols-[1fr_1fr_160px] gap-2">
                    <Input
                      value={inviteDraft.full_name}
                      onChange={(e) =>
                        setInviteDraft({
                          ...inviteDraft,
                          full_name: e.target.value,
                        })
                      }
                      placeholder="Full name"
                      disabled={sendingInvites}
                    />
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <Input
                        type="email"
                        value={inviteDraft.email}
                        onChange={(e) =>
                          setInviteDraft({
                            ...inviteDraft,
                            email: e.target.value,
                          })
                        }
                        placeholder="teammate@company.co.ke"
                        className="pl-9"
                        disabled={sendingInvites}
                      />
                    </div>
                    <Select
                      value={inviteDraft.role}
                      onValueChange={(v) =>
                        setInviteDraft({ ...inviteDraft, role: v })
                      }
                      disabled={sendingInvites}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={queueInvite}
                    className="gap-1.5 self-start"
                    disabled={sendingInvites}
                  >
                    <Plus className="size-3.5" />
                    Queue invite
                  </Button>
                </div>

                {invites.length > 0 && (
                  <div className="rounded-xl border border-slate-200/80 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-200/80 text-xs font-medium text-slate-600 flex items-center justify-between">
                      <span>
                        {invites.length}{" "}
                        {invites.length === 1 ? "invite" : "invites"} queued
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Sent when you finish setup
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {invites.map((i) => (
                        <div
                          key={i.email}
                          className="px-3 py-2.5 flex items-center gap-3"
                        >
                          <div className="h-8 w-8 rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {i.full_name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((p) => p[0]?.toUpperCase() ?? "")
                              .join("") || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {i.full_name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {i.email}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="capitalize text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 shrink-0"
                          >
                            {
                              ROLE_OPTIONS.find((r) => r.value === i.role)
                                ?.label
                            }
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeInvite(i.email)}
                            className="h-8 w-8 shrink-0"
                            aria-label="Remove invite"
                          >
                            <Trash2 className="size-3.5 text-rose-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 flex gap-2.5">
                  <Info className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-900 leading-relaxed">
                    Invited teammates receive a temporary password in the next
                    release. For now, share their login credentials directly
                    from the Users page.
                  </p>
                </div>
              </div>
            )}

            {/* Step 6 — done */}
            {currentStep.key === "done" && (
              <div className="grid gap-5">
                <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 via-white to-teal-50 p-6 text-center">
                  <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg">
                    <PartyPopper className="size-6 text-white" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">
                    Your workspace is ready
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
                    We&apos;ll drop you in the app launcher. Here&apos;s what
                    to try first:
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    {
                      icon: Building2,
                      title: "Add your first customer",
                      detail: "CRM → Customers → New",
                      tone: "from-sky-500 to-blue-600",
                    },
                    {
                      icon: Copy,
                      title: "Create a product or service",
                      detail: "Inventory → Products",
                      tone: "from-emerald-500 to-teal-600",
                    },
                    {
                      icon: CheckCircle2,
                      title: "Issue your first invoice",
                      detail: "Sales → Invoices → New",
                      tone: "from-violet-500 to-indigo-600",
                    },
                    {
                      icon: Landmark,
                      title: "Import a bank statement",
                      detail: "Reconciliation → Import",
                      tone: "from-amber-500 to-orange-600",
                    },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <div
                        key={t.title}
                        className="rounded-xl border border-slate-200/80 bg-white p-3 flex items-start gap-3"
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-linear-to-br",
                            t.tone
                          )}
                        >
                          <Icon className="size-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 leading-tight">
                            {t.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Footer navigation */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                {stepIdx > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={saving || finishing}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {stepIdx < STEPS.length - 1 && (
                  <Button
                    onClick={handleNext}
                    disabled={saving}
                    className="gap-1.5 bg-linear-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md"
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    Continue
                    {!saving && <ArrowRight className="size-3.5" />}
                  </Button>
                )}
                {stepIdx === STEPS.length - 1 && (
                  <Button
                    onClick={finishOnboarding}
                    disabled={finishing}
                    className="gap-1.5 bg-linear-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md"
                  >
                    {finishing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Rocket className="size-3.5" />
                    )}
                    Launch workspace
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
