"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Download, Loader2 } from "lucide-react";
import InvoicePDF from "@/components/documents/InvoicePDF";

export default function PrintInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{ invoice: any; tenant: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sales/invoices/${params.id}/pdf`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading invoice...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-slate-900 font-semibold">Invoice not found</p>
          <button onClick={() => router.back()} className="mt-3 text-blue-600 text-sm">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Controls - hidden when printing */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/25">
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="flex justify-center print:block">
        <div className="shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none">
          <div ref={printRef}>
            <InvoicePDF invoice={data.invoice} tenant={data.tenant} />
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-pdf, #invoice-pdf * { visibility: visible; }
          #invoice-pdf { position: fixed; left: 0; top: 0; width: 100%; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}