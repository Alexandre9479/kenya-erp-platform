"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  company_email: z.email("Please enter a valid email address"),
  company_phone: z.string().min(9, "Please enter a valid phone number"),
  country: z.string().min(1, "Country is required"),
  kra_pin: z.string().optional(),
});

const step2Schema = z
  .object({
    admin_name: z.string().min(2, "Full name must be at least 2 characters"),
    admin_email: z.email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type AllFormData = Step1Data & Step2Data;

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: "Company", icon: Building2 },
  { label: "Admin", icon: User },
  { label: "Review", icon: CheckCircle2 },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-6">
      {STEPS.map((step, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200",
                  done && "bg-primary text-primary-foreground",
                  active &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !done && !active && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors duration-200",
                  done ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Company Details ──────────────────────────────────────────────────

function Step1({
  onNext,
  defaults,
}: {
  onNext: (d: Step1Data) => void;
  defaults: Partial<Step1Data>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { country: "Kenya", ...defaults },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4" noValidate>
      <div className="mb-2">
        <h2 className="text-lg font-semibold">Company Information</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tell us about your business
        </p>
      </div>

      {/* Company Name */}
      <div className="space-y-1.5">
        <Label htmlFor="company_name">Company Name *</Label>
        <Input
          id="company_name"
          placeholder="e.g. Acme Trading Ltd"
          autoFocus
          {...register("company_name")}
          className={errors.company_name ? "border-destructive" : ""}
        />
        {errors.company_name && (
          <p className="text-xs text-destructive">{errors.company_name.message}</p>
        )}
      </div>

      {/* Company Email */}
      <div className="space-y-1.5">
        <Label htmlFor="company_email">Company Email *</Label>
        <Input
          id="company_email"
          type="email"
          placeholder="info@acme.co.ke"
          {...register("company_email")}
          className={errors.company_email ? "border-destructive" : ""}
        />
        {errors.company_email && (
          <p className="text-xs text-destructive">{errors.company_email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="company_phone">Phone Number *</Label>
        <Input
          id="company_phone"
          type="tel"
          placeholder="+254 7XX XXX XXX"
          {...register("company_phone")}
          className={errors.company_phone ? "border-destructive" : ""}
        />
        {errors.company_phone && (
          <p className="text-xs text-destructive">{errors.company_phone.message}</p>
        )}
      </div>

      {/* Country + KRA PIN */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            placeholder="Kenya"
            {...register("country")}
            className={errors.country ? "border-destructive" : ""}
          />
          {errors.country && (
            <p className="text-xs text-destructive">{errors.country.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kra_pin">
            KRA PIN{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="kra_pin"
            placeholder="A001XXXXX"
            {...register("kra_pin")}
          />
        </div>
      </div>

      <Button type="submit" className="w-full font-semibold" size="lg">
        Continue
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </form>
  );
}

// ─── Step 2: Admin Account ────────────────────────────────────────────────────

function Step2({
  onNext,
  onBack,
  defaults,
}: {
  onNext: (d: Step2Data) => void;
  onBack: () => void;
  defaults: Partial<Step2Data>;
}) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: defaults,
  });

  const password = watch("password", "");

  // Password strength (0–4)
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const strengthMeta = [
    { label: "", color: "" },
    { label: "Weak", color: "bg-red-500" },
    { label: "Fair", color: "bg-orange-400" },
    { label: "Good", color: "bg-blue-500" },
    { label: "Strong", color: "bg-green-500" },
  ][strength] ?? { label: "", color: "" };

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4" noValidate>
      <div className="mb-2">
        <h2 className="text-lg font-semibold">Administrator Account</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          This will be your login credentials
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <Label htmlFor="admin_name">Full Name *</Label>
        <Input
          id="admin_name"
          placeholder="John Kamau"
          autoFocus
          {...register("admin_name")}
          className={errors.admin_name ? "border-destructive" : ""}
        />
        {errors.admin_name && (
          <p className="text-xs text-destructive">{errors.admin_name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="admin_email">Email Address *</Label>
        <Input
          id="admin_email"
          type="email"
          placeholder="john@acme.co.ke"
          {...register("admin_email")}
          className={errors.admin_email ? "border-destructive" : ""}
        />
        {errors.admin_email && (
          <p className="text-xs text-destructive">{errors.admin_email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
            {...register("password")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPass ? "Hide password" : "Show password"}
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Strength meter */}
        {password.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    i <= strength ? strengthMeta.color : "bg-border"
                  )}
                />
              ))}
            </div>
            {strengthMeta.label && (
              <p
                className={cn(
                  "text-xs font-medium",
                  strength === 1 && "text-red-500",
                  strength === 2 && "text-orange-500",
                  strength === 3 && "text-blue-600",
                  strength === 4 && "text-green-600"
                )}
              >
                {strengthMeta.label}
              </p>
            )}
          </div>
        )}
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirm_password">Confirm Password *</Label>
        <div className="relative">
          <Input
            id="confirm_password"
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            className={`pr-10 ${errors.confirm_password ? "border-destructive" : ""}`}
            {...register("confirm_password")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={showConfirm ? "Hide password" : "Show password"}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirm_password && (
          <p className="text-xs text-destructive">
            {errors.confirm_password.message}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" className="flex-1 font-semibold">
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3: Review & Submit ──────────────────────────────────────────────────

function Step3({
  data,
  onBack,
  isLoading,
  onSubmit,
}: {
  data: AllFormData;
  onBack: () => void;
  isLoading: boolean;
  onSubmit: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold">Review & Confirm</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Check your details before creating your account
        </p>
      </div>

      {/* Company summary */}
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Company
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium truncate">{data.company_name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium truncate">{data.company_email}</dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="font-medium">{data.company_phone}</dd>
          <dt className="text-muted-foreground">Country</dt>
          <dd className="font-medium">{data.country}</dd>
          {data.kra_pin && (
            <>
              <dt className="text-muted-foreground">KRA PIN</dt>
              <dd className="font-medium">{data.kra_pin}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Admin summary */}
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Administrator
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{data.admin_name}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium truncate">{data.admin_email}</dd>
          <dt className="text-muted-foreground">Password</dt>
          <dd className="font-medium">{"•".repeat(8)}</dd>
        </dl>
      </div>

      {/* Trial badge */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3.5 flex gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">
            30-day free trial included
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Full access to all modules. No credit card required.
          </p>
        </div>
      </div>

      {/* Terms */}
      <div className="flex items-start gap-3 pt-1">
        <Checkbox
          id="terms"
          checked={accepted}
          onCheckedChange={(v) => setAccepted(v as boolean)}
          className="mt-0.5"
        />
        <Label
          htmlFor="terms"
          className="font-normal text-sm text-muted-foreground leading-relaxed cursor-pointer"
        >
          I agree to the{" "}
          <span className="text-primary font-medium hover:underline cursor-pointer">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="text-primary font-medium hover:underline cursor-pointer">
            Privacy Policy
          </span>
        </Label>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          type="button"
          className="flex-1 font-semibold"
          disabled={!accepted || isLoading}
          onClick={onSubmit}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Create Account
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

function RegisterWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<AllFormData>>({
    country: "Kenya",
  });

  const handleStep1 = (data: Step1Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStep2 = (data: Step2Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json() as { error?: string };

      if (!res.ok) {
        toast.error(json.error ?? "Registration failed. Please try again.");
        return;
      }

      toast.success("Account created! Redirecting to sign in…");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Page heading */}
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
        <p className="text-slate-500 mt-1.5">Start your 30-day free trial — no credit card required</p>
      </div>

      {/* Wizard card */}
      <Card className="shadow-sm border border-slate-200 bg-white">
        <CardContent className="pt-6 pb-6">
          <StepIndicator current={step} />

          {step === 1 && (
            <Step1
              onNext={handleStep1}
              defaults={{
                company_name: formData.company_name,
                company_email: formData.company_email,
                company_phone: formData.company_phone,
                country: formData.country ?? "Kenya",
                kra_pin: formData.kra_pin,
              }}
            />
          )}

          {step === 2 && (
            <Step2
              onNext={handleStep2}
              onBack={() => setStep(1)}
              defaults={{
                admin_name: formData.admin_name,
                admin_email: formData.admin_email,
                password: formData.password,
                confirm_password: formData.confirm_password,
              }}
            />
          )}

          {step === 3 && formData.company_name && formData.admin_name && (
            <Step3
              data={formData as AllFormData}
              onBack={() => setStep(2)}
              isLoading={isLoading}
              onSubmit={handleSubmit}
            />
          )}
        </CardContent>
      </Card>

      {/* Sign in link */}
      <p className="text-center text-sm text-slate-500 mt-5">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-4 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterWizard />
    </Suspense>
  );
}
