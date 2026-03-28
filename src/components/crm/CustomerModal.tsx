"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { CustomerData } from "@/app/(dashboard)/crm/page";

const schema = z.object({
  name: z.string().min(1, "Customer name is required"),
  type: z.enum(["individual", "company", "government"]),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  kraPin: z.string().optional(),
  creditLimit: z.coerce.number().default(0),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerForm = z.infer<typeof schema>;

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer?: CustomerData | null;
}

export default function CustomerModal({ open, onClose, onSuccess, customer }: CustomerModalProps) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(schema) as any,
    defaultValues: { type: "company", country: "Kenya", creditLimit: 0, paymentTerms: "30" },
  });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        type: customer.type,
        email: customer.email || "",
        phone: customer.phone || "",
        phone2: customer.phone2 || "",
        address: customer.address || "",
        city: customer.city || "",
        country: customer.country || "Kenya",
        kraPin: customer.kraPin || "",
        creditLimit: Number(customer.creditLimit) || 0,
        paymentTerms: customer.paymentTerms || "30",
        notes: customer.notes || "",
      });
    } else {
      reset({ type: "company", country: "Kenya", creditLimit: 0, paymentTerms: "30" });
    }
  }, [customer, reset, open]);

  const onSubmit = async (data: CustomerForm) => {
    setLoading(true);
    try {
      const url = customer ? `/api/crm/customers/${customer.id}` : "/api/crm/customers";
      const method = customer ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(customer ? "Customer updated!" : "Customer added!");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "Failed to save customer");
      }
    } catch {
      toast.error("Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {customer ? "Edit Customer" : "Add Customer"}
              </h2>
              <p className="text-sm text-slate-500">Fill in the customer details</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-4">
            {/* Name & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name / Company Name *</label>
                <input {...register("name")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Kamau Enterprises Ltd" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Type *</label>
                <select {...register("type")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="company">Company</option>
                  <option value="individual">Individual</option>
                  <option value="government">Government</option>
                </select>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
                <input {...register("email")} type="email"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@company.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Phone *</label>
                <input {...register("phone")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+254 700 000 000" />
              </div>
            </div>

            {/* Phone 2 & KRA PIN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Phone 2</label>
                <input {...register("phone2")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Alternative phone" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">KRA PIN</label>
                <input {...register("kraPin")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="A123456789Z" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Address</label>
              <input {...register("address")}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Street address" />
            </div>

            {/* City & Country */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">City</label>
                <input {...register("city")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nairobi" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Country</label>
                <input {...register("country")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kenya" />
              </div>
            </div>

            {/* Credit Limit & Payment Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Credit Limit (KSh)</label>
                <input {...register("creditLimit")} type="number" min="0"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Payment Terms (days)</label>
                <select {...register("paymentTerms")}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="0">Due on Receipt</option>
                  <option value="7">Net 7 days</option>
                  <option value="14">Net 14 days</option>
                  <option value="30">Net 30 days</option>
                  <option value="60">Net 60 days</option>
                  <option value="90">Net 90 days</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Notes</label>
              <textarea {...register("notes")} rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Additional notes about this customer..." />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit(onSubmit)} disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {customer ? "Update Customer" : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}