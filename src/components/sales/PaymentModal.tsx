"use client";

import { useState } from "react";
import { X, Loader2, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: string | number;
  amountPaid: string | number;
  amountDue: string | number;
  customerName?: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: Invoice | null;
}

const PAYMENT_METHODS = [
  { value: "cash",          label: "💵 Cash",          color: "border-green-200 bg-green-50 text-green-700" },
  { value: "mpesa",         label: "📱 M-Pesa",        color: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "bank_transfer", label: "🏦 Bank Transfer",  color: "border-purple-200 bg-purple-50 text-purple-700" },
  { value: "cheque",        label: "📋 Cheque",         color: "border-orange-200 bg-orange-50 text-orange-700" },
  { value: "card",          label: "💳 Card",           color: "border-slate-200 bg-slate-50 text-slate-700" },
];

export default function PaymentModal({ open, onClose, onSuccess, invoice }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  if (!open || !invoice) return null;

  const amountDue = Number(invoice.amountDue);
  const amountPaid = Number(invoice.amountPaid);
  const total = Number(invoice.total);
  const paymentAmount = Number(amount) || 0;
  const remainingAfter = amountDue - paymentAmount;
  const isFullPayment = paymentAmount >= amountDue - 0.01;

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (Number(amount) > amountDue + 0.01) {
      toast.error(`Amount cannot exceed balance due (KSh ${amountDue.toLocaleString()})`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/sales/invoices/${invoice.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          paymentMethod,
          paymentDate,
          reference,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Payment recorded successfully!");
        onSuccess();
        onClose();
        // Reset form
        setAmount("");
        setReference("");
        setNotes("");
        setPaymentMethod("cash");
      } else {
        toast.error(data.error || "Failed to record payment");
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
              <p className="text-sm text-slate-500">{invoice.invoiceNumber} — {invoice.customerName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Invoice Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Invoice Total</span>
              <span className="font-semibold text-slate-900">
                KSh {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Already Paid</span>
                <span className="font-semibold text-green-600">
                  KSh {amountPaid.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-900">Balance Due</span>
              <span className="font-bold text-red-600">
                KSh {amountDue.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">Payment Amount *</label>
              <button
                onClick={() => setAmount(String(amountDue))}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Pay full amount
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                KSh
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={amountDue}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-right font-semibold text-lg"
                placeholder="0.00"
              />
            </div>
            {/* After payment preview */}
            {paymentAmount > 0 && (
              <div className={cn(
                "mt-2 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg",
                isFullPayment
                  ? "bg-green-50 text-green-700"
                  : "bg-yellow-50 text-yellow-700"
              )}>
                {isFullPayment
                  ? <><CheckCircle className="w-3.5 h-3.5" /> Invoice will be marked as PAID</>
                  : <>Remaining balance after payment: KSh {Math.max(0, remainingAfter).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</>
                }
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left",
                    paymentMethod === method.value
                      ? method.color + " ring-2 ring-offset-1 " + method.color.split(" ")[0].replace("border", "ring")
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Reference / Receipt No.
              </label>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. MPesa code"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Optional payment notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || Number(amount) <= 0}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-green-500/25"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <DollarSign className="w-4 h-4" />
            }
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}