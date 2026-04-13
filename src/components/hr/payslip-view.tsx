"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

const KES = (v: number) => new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 }).format(v);

type PayslipData = {
  employee: {
    id: string;
    employee_number: string;
    full_name: string;
    department: string | null;
    employment_type: string;
    basic_salary: number;
    kra_pin: string | null;
    nhif_number: string | null;
    nssf_number: string | null;
    id_number: string | null;
    bank_name: string | null;
    bank_account: string | null;
    bank_branch: string | null;
  };
  tenant: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    kra_pin: string | null;
    logo_url: string | null;
  } | null;
  month: number;
  year: number;
  monthName: string;
  earnings: {
    basic_salary: number;
    gross: number;
  };
  deductions: {
    paye: number;
    nhif: number;
    nssf_employee: number;
    total: number;
  };
  employer_contributions: {
    nssf_employer: number;
  };
  net_pay: number;
};

interface Props {
  employeeId: string;
  month: number;
  year: number;
}

export function PayslipView({ employeeId, month, year }: Props) {
  const [data, setData] = useState<PayslipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPayslip();
  }, [employeeId, month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPayslip() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ employee_id: employeeId, month: String(month), year: String(year) });
      const res = await fetch(`/api/payroll/payslip?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load payslip");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const { employee, tenant, monthName, earnings, deductions, employer_contributions, net_pay } = data;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #payslip-printable, #payslip-printable * { visibility: visible !important; }
          #payslip-printable { position: fixed; inset: 0; padding: 24px; background: white; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/hr"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Payslip — {employee.full_name}</h2>
              <p className="text-sm text-slate-500">{monthName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />Print
            </Button>
            <Button size="sm" onClick={() => window.print()} className="gap-2 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 text-white">
              <Download className="h-4 w-4" />Export PDF
            </Button>
          </div>
        </div>

        {/* Printable payslip */}
        <div id="payslip-printable">
          <Card className="border-0 shadow-sm overflow-hidden">
            {/* Company header */}
            <div className="bg-linear-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white print:bg-white print:text-slate-900 print:border-b-2 print:border-indigo-600">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {tenant?.logo_url && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/20 print:bg-slate-100">
                      <Image src={tenant.logo_url} alt="Logo" fill className="object-contain" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-bold">{tenant?.name ?? "Company"}</h1>
                    {tenant?.address && <p className="text-sm opacity-80 print:text-slate-500">{tenant.address}</p>}
                    {tenant?.city && <p className="text-sm opacity-80 print:text-slate-500">{tenant.city}</p>}
                    {tenant?.kra_pin && <p className="text-xs opacity-70 print:text-slate-400 mt-0.5">KRA PIN: {tenant.kra_pin}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-extrabold uppercase tracking-wider">Payslip</h2>
                  <p className="text-sm font-semibold mt-1 opacity-90 print:text-slate-700">{monthName}</p>
                </div>
              </div>
            </div>

            <CardContent className="px-6 py-5 space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Employee Name</p>
                    <p className="font-bold text-slate-900">{employee.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Employee #</p>
                    <p className="font-medium text-slate-700">{employee.employee_number}</p>
                  </div>
                  {employee.department && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Department</p>
                      <p className="font-medium text-slate-700">{employee.department}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {employee.id_number && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">ID Number</p>
                      <p className="font-medium text-slate-700">{employee.id_number}</p>
                    </div>
                  )}
                  {employee.kra_pin && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">KRA PIN</p>
                      <p className="font-medium text-slate-700">{employee.kra_pin}</p>
                    </div>
                  )}
                  {employee.nhif_number && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">NHIF #</p>
                      <p className="font-medium text-slate-700">{employee.nhif_number}</p>
                    </div>
                  )}
                  {employee.nssf_number && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">NSSF #</p>
                      <p className="font-medium text-slate-700">{employee.nssf_number}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Earnings & Deductions side by side */}
              <div className="grid grid-cols-2 gap-6">
                {/* Earnings */}
                <div>
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Earnings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Basic Salary</span>
                      <span className="font-medium text-slate-900">{KES(earnings.basic_salary)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span className="text-emerald-800">Gross Pay</span>
                      <span className="text-emerald-800">{KES(earnings.gross)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">Deductions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">PAYE (Income Tax)</span>
                      <span className="font-medium text-slate-900">{KES(deductions.paye)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">SHIF/NHIF</span>
                      <span className="font-medium text-slate-900">{KES(deductions.nhif)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">NSSF (Employee)</span>
                      <span className="font-medium text-slate-900">{KES(deductions.nssf_employee)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span className="text-red-800">Total Deductions</span>
                      <span className="text-red-800">{KES(deductions.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Net Pay */}
              <div className="rounded-xl bg-linear-to-r from-indigo-50 to-blue-50 border border-indigo-200 p-5 print:bg-slate-50 print:border-slate-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-indigo-800 uppercase tracking-wider">Net Pay</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Gross earnings minus total deductions</p>
                  </div>
                  <p className="text-3xl font-extrabold text-indigo-800">KES {KES(net_pay)}</p>
                </div>
              </div>

              {/* Employer Contributions */}
              <div className="text-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Employer Contributions</h3>
                <div className="flex justify-between text-slate-600">
                  <span>NSSF (Employer)</span>
                  <span className="font-medium">{KES(employer_contributions.nssf_employer)}</span>
                </div>
              </div>

              {/* Bank Details */}
              {(employee.bank_name || employee.bank_account) && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Details</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {employee.bank_name && (
                        <div>
                          <p className="text-xs text-slate-400">Bank</p>
                          <p className="font-medium text-slate-700">{employee.bank_name}</p>
                        </div>
                      )}
                      {employee.bank_account && (
                        <div>
                          <p className="text-xs text-slate-400">Account #</p>
                          <p className="font-medium text-slate-700">{employee.bank_account}</p>
                        </div>
                      )}
                      {employee.bank_branch && (
                        <div>
                          <p className="text-xs text-slate-400">Branch</p>
                          <p className="font-medium text-slate-700">{employee.bank_branch}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="border-t border-slate-200 pt-4 mt-4 text-center">
                <p className="text-xs text-slate-400">This is a computer-generated payslip and does not require a signature.</p>
                {tenant?.email && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    For queries, contact HR at {tenant.email}{tenant.phone ? ` or ${tenant.phone}` : ""}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
