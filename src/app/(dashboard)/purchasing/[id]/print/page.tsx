"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import LPOPDF from "@/components/documents/LPOPDF";

export default function PrintLPOPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<{ lpo: any; tenant: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/purchasing/lpos/${params.id}/pdf`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading LPO...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-slate-900 font-semibold">LPO not found</p>
          <button onClick={() => router.back()} className="mt-3 text-blue-600 text-sm">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden mb-6 flex items-center justify-between">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-green-500/25">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      <div className="flex justify-center print:block">
        <div className="shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none">
          <LPOPDF lpo={data.lpo} tenant={data.tenant} />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #lpo-pdf, #lpo-pdf * { visibility: visible; }
          #lpo-pdf { position: fixed; left: 0; top: 0; width: 100%; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}