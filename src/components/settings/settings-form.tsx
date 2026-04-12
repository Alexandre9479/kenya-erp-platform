"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Building2, FileText, Landmark, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Local TenantRow type (matches DB schema) ─────────────────────────────────

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
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
  subscription_plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  is_active: boolean;
  bank_name: string | null;
  bank_account: string | null;
  bank_branch: string | null;
  invoice_prefix: string;
  quote_prefix: string;
  lpo_prefix: string;
  terms_and_conditions: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().min(1, "Country is required"),
  kra_pin: z.string().optional().nullable(),
  invoice_prefix: z
    .string()
    .min(1, "Invoice prefix is required")
    .max(10, "Max 10 characters"),
  quote_prefix: z
    .string()
    .min(1, "Quote prefix is required")
    .max(10, "Max 10 characters"),
  lpo_prefix: z
    .string()
    .min(1, "LPO prefix is required")
    .max(10, "Max 10 characters"),
  terms_and_conditions: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
  bank_branch: z.string().optional().nullable(),
  currency: z.string().min(1, "Currency is required"),
  timezone: z.string().min(1, "Timezone is required"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SettingsFormProps {
  tenant: TenantRow;
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsForm({ tenant }: SettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone ?? "",
      address: tenant.address ?? "",
      city: tenant.city ?? "",
      country: tenant.country,
      kra_pin: tenant.kra_pin ?? "",
      invoice_prefix: tenant.invoice_prefix,
      quote_prefix: tenant.quote_prefix,
      lpo_prefix: tenant.lpo_prefix,
      terms_and_conditions: tenant.terms_and_conditions ?? "",
      bank_name: tenant.bank_name ?? "",
      bank_account: tenant.bank_account ?? "",
      bank_branch: tenant.bank_branch ?? "",
      currency: tenant.currency,
      timezone: tenant.timezone,
    },
  });

  const currency = watch("currency");
  const timezone = watch("timezone");

  const onSubmit = async (values: SettingsFormValues) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save settings.");
        return;
      }
      toast.success("Settings saved successfully.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your company information and preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Company Information ───────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-500" />
              <div>
                <CardTitle className="text-base">Company Information</CardTitle>
                <CardDescription>
                  Your business details shown on documents and invoices.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Company Name" error={errors.name?.message}>
                <Input
                  {...register("name")}
                  placeholder="Acme Corporation Ltd"
                  className={errors.name ? "border-destructive" : ""}
                />
              </Field>
            </div>

            <Field label="Email" error={errors.email?.message}>
              <Input
                {...register("email")}
                type="email"
                placeholder="info@company.co.ke"
                className={errors.email ? "border-destructive" : ""}
              />
            </Field>

            <Field label="Phone" error={errors.phone?.message}>
              <Input
                {...register("phone")}
                placeholder="+254 700 000 000"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Address" error={errors.address?.message}>
                <Input
                  {...register("address")}
                  placeholder="123 Kimathi Street"
                />
              </Field>
            </div>

            <Field label="City" error={errors.city?.message}>
              <Input
                {...register("city")}
                placeholder="Nairobi"
              />
            </Field>

            <Field label="Country" error={errors.country?.message}>
              <Input
                {...register("country")}
                placeholder="Kenya"
              />
            </Field>

            <Field label="KRA PIN" error={errors.kra_pin?.message}>
              <Input
                {...register("kra_pin")}
                placeholder="P000000000A"
              />
            </Field>
          </CardContent>
        </Card>

        {/* ── Invoice Settings ──────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              <div>
                <CardTitle className="text-base">Invoice Settings</CardTitle>
                <CardDescription>
                  Document numbering prefixes and terms applied to all outgoing
                  documents.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Invoice Prefix" error={errors.invoice_prefix?.message}>
              <Input
                {...register("invoice_prefix")}
                placeholder="INV"
                className={errors.invoice_prefix ? "border-destructive" : ""}
              />
            </Field>

            <Field label="Quote Prefix" error={errors.quote_prefix?.message}>
              <Input
                {...register("quote_prefix")}
                placeholder="QT"
                className={errors.quote_prefix ? "border-destructive" : ""}
              />
            </Field>

            <Field label="LPO Prefix" error={errors.lpo_prefix?.message}>
              <Input
                {...register("lpo_prefix")}
                placeholder="LPO"
                className={errors.lpo_prefix ? "border-destructive" : ""}
              />
            </Field>

            <div className="sm:col-span-3">
              <Field
                label="Terms & Conditions"
                error={errors.terms_and_conditions?.message}
              >
                <Textarea
                  {...register("terms_and_conditions")}
                  placeholder="Enter your standard terms and conditions printed on invoices..."
                  rows={5}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* ── Banking ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-slate-500" />
              <div>
                <CardTitle className="text-base">Banking Details</CardTitle>
                <CardDescription>
                  Bank information printed on invoices for payment instructions.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Bank Name" error={errors.bank_name?.message}>
              <Input
                {...register("bank_name")}
                placeholder="Equity Bank"
              />
            </Field>

            <Field label="Account Number" error={errors.bank_account?.message}>
              <Input
                {...register("bank_account")}
                placeholder="0123456789"
              />
            </Field>

            <Field label="Branch" error={errors.bank_branch?.message}>
              <Input
                {...register("bank_branch")}
                placeholder="Nairobi Branch"
              />
            </Field>
          </CardContent>
        </Card>

        {/* ── Regional ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-slate-500" />
              <div>
                <CardTitle className="text-base">Regional Settings</CardTitle>
                <CardDescription>
                  Currency and timezone used across the platform.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Currency" error={errors.currency?.message}>
              <Select
                value={currency}
                onValueChange={(val) =>
                  setValue("currency", val, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  className={errors.currency ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  <SelectItem value="TZS">TZS — Tanzanian Shilling</SelectItem>
                  <SelectItem value="UGX">UGX — Ugandan Shilling</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Timezone" error={errors.timezone?.message}>
              <Select
                value={timezone}
                onValueChange={(val) =>
                  setValue("timezone", val, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  className={errors.timezone ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Nairobi">
                    Africa/Nairobi (EAT, UTC+3)
                  </SelectItem>
                  <SelectItem value="Africa/Kampala">
                    Africa/Kampala (EAT, UTC+3)
                  </SelectItem>
                  <SelectItem value="Africa/Dar_es_Salaam">
                    Africa/Dar_es_Salaam (EAT, UTC+3)
                  </SelectItem>
                  <SelectItem value="Africa/Lagos">
                    Africa/Lagos (WAT, UTC+1)
                  </SelectItem>
                  <SelectItem value="Africa/Johannesburg">
                    Africa/Johannesburg (SAST, UTC+2)
                  </SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Europe/London">
                    Europe/London (GMT/BST)
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* ── Save ──────────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="min-w-32">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
