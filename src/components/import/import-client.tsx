"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Users,
  Package,
  Calculator,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseCSVToObjects } from "@/lib/csv/parse";

type TabKey = "customers" | "products" | "opening_balances";

type ImportResponse = {
  inserted: number;
  failed: number;
  total: number;
  errors: { row: number; message: string }[];
  error?: string;
  entry?: {
    id: string;
    entry_number: string;
    total_debit: number;
    total_credit: number;
  };
};

const TEMPLATES: Record<
  TabKey,
  { filename: string; header: string; sample: string }
> = {
  customers: {
    filename: "customers-template.csv",
    header: "name,email,phone,address,city,kra_pin,credit_limit,notes",
    sample:
      'Acme Traders Ltd,accounts@acme.co.ke,+254712345678,"Kimathi Street",Nairobi,P051234567A,50000,"Net 30 terms"\nBlue Ribbon Supplies,info@blueribbon.co.ke,+254733111222,"Mombasa Rd",Nairobi,,10000,',
  },
  products: {
    filename: "products-template.csv",
    header:
      "sku,name,category,description,unit,cost_price,selling_price,vat_rate,reorder_level,barcode",
    sample:
      'SKU-001,"Office Chair",Furniture,"Ergonomic swivel chair",pcs,4500,7500,16,5,8710000011\nSKU-002,"A4 Paper Ream",Stationery,"80 gsm white",ream,380,550,16,20,',
  },
  opening_balances: {
    filename: "opening-balances-template.csv",
    header: "account_code,debit,credit,description",
    sample:
      '1000,250000,0,"Opening cash"\n1100,480000,0,"AR opening"\n2000,0,180000,"AP opening"\n3000,0,550000,"Owner capital"',
  },
};

function downloadTemplate(tab: TabKey) {
  const { filename, header, sample } = TEMPLATES[tab];
  const blob = new Blob([`${header}\n${sample}\n`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type TabState = {
  csvText: string;
  entryDate: string;
  description: string;
  result: ImportResponse | null;
  submitting: boolean;
};

function initialState(): TabState {
  return {
    csvText: "",
    entryDate: new Date().toISOString().slice(0, 10),
    description: "Opening balances",
    result: null,
    submitting: false,
  };
}

export function ImportClient() {
  const [tab, setTab] = useState<TabKey>("customers");
  const [states, setStates] = useState<Record<TabKey, TabState>>({
    customers: initialState(),
    products: initialState(),
    opening_balances: initialState(),
  });

  const current = states[tab];

  function update(next: Partial<TabState>) {
    setStates((s) => ({ ...s, [tab]: { ...s[tab], ...next } }));
  }

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      update({ csvText: text, result: null });
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Could not read file");
    }
  }

  const preview = useMemo(() => {
    if (!current.csvText.trim()) return null;
    try {
      const { headers, rows } = parseCSVToObjects(current.csvText);
      return { headers, rows: rows.slice(0, 5), totalRows: rows.length };
    } catch {
      return null;
    }
  }, [current.csvText]);

  async function submit() {
    if (!current.csvText.trim()) {
      toast.error("Paste or upload a CSV first");
      return;
    }
    update({ submitting: true, result: null });

    try {
      let url = "/api/import/customers";
      let payload: Record<string, unknown> = { csv_text: current.csvText };
      if (tab === "products") url = "/api/import/products";
      if (tab === "opening_balances") {
        url = "/api/import/opening-balances";
        payload = {
          csv_text: current.csvText,
          entry_date: current.entryDate,
          description: current.description,
        };
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ImportResponse;
      update({ submitting: false, result: json });

      if (!res.ok) {
        toast.error(json.error ?? "Import failed");
        return;
      }
      if (json.failed > 0 && json.inserted > 0) {
        toast.warning(
          `${json.inserted} imported, ${json.failed} skipped`
        );
      } else if (json.failed > 0) {
        toast.error(`${json.failed} rows had errors`);
      } else {
        toast.success(`Imported ${json.inserted} of ${json.total} rows`);
      }
    } catch (err) {
      console.error(err);
      update({ submitting: false });
      toast.error("Network error — try again");
    }
  }

  const tabMeta: Record<
    TabKey,
    {
      label: string;
      icon: typeof Users;
      blurb: string;
      required: string;
    }
  > = {
    customers: {
      label: "Customers",
      icon: Users,
      blurb: "Bulk-create your customer master data",
      required: "name",
    },
    products: {
      label: "Products",
      icon: Package,
      blurb: "Seed your catalogue with SKUs, prices & VAT",
      required: "sku, name, unit, cost_price, selling_price, vat_rate, reorder_level",
    },
    opening_balances: {
      label: "Opening balances",
      icon: Calculator,
      blurb: "Post a balanced journal for your trial balance",
      required: "account_code, debit, credit",
    },
  };

  const activeMeta = tabMeta[tab];
  const Icon = activeMeta.icon;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-violet-200/60 bg-linear-to-br from-violet-900 via-purple-800 to-fuchsia-700 p-6 sm:p-8 shadow-xl">
        <div className="pointer-events-none absolute -top-24 -right-20 w-80 h-80 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white/90 border border-white/20">
              <Sparkles className="size-3.5" />
              Data import
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Bring your data in, fast
            </h1>
            <p className="mt-1.5 text-sm text-white/80 max-w-2xl">
              Upload or paste CSV files for customers, products, and opening
              balances. Rows are validated before anything is written — bad
              rows are reported per-line.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadTemplate(tab)}
              className="gap-1.5 bg-white text-violet-900 hover:bg-white/90"
            >
              <Download className="size-3.5" />
              Template
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(tabMeta) as TabKey[]).map((key) => {
            const M = tabMeta[key];
            const Ico = M.icon;
            const active = key === tab;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`text-left rounded-2xl border backdrop-blur-sm px-4 py-3 transition ${
                  active
                    ? "bg-white/20 border-white/40 shadow-lg"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex size-9 items-center justify-center rounded-xl ${
                      active
                        ? "bg-linear-to-br from-white/90 to-white/70 text-violet-900"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    <Ico className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {M.label}
                    </p>
                    <p className="text-[11px] text-white/70 mt-0.5">
                      {M.blurb}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-4">
        <TabsList className="hidden">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="opening_balances">Opening balances</TabsTrigger>
        </TabsList>

        {(Object.keys(tabMeta) as TabKey[]).map((key) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <Card className="border-slate-200/80 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {activeMeta.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Required columns:{" "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-700">
                        {activeMeta.required}
                      </code>
                    </p>
                  </div>
                </div>

                {tab === "opening_balances" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="entry_date" className="text-xs">
                        Entry date
                      </Label>
                      <Input
                        id="entry_date"
                        type="date"
                        value={current.entryDate}
                        onChange={(e) =>
                          update({ entryDate: e.target.value, result: null })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-xs">
                        Journal description
                      </Label>
                      <Input
                        id="description"
                        value={current.description}
                        onChange={(e) =>
                          update({ description: e.target.value, result: null })
                        }
                        placeholder="Opening balances"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Upload className="size-3.5" /> Upload CSV
                    </Label>
                    <label className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50 transition cursor-pointer py-8 px-4 text-center">
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleFile(f);
                        }}
                      />
                      <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
                        <FileSpreadsheet className="size-4 text-violet-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        Click to choose a .csv file
                      </p>
                      <p className="text-[11px] text-slate-500">
                        or drop in the textarea on the right
                      </p>
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate(tab)}
                      className="w-full gap-1.5"
                    >
                      <Download className="size-3.5" />
                      Download {activeMeta.label.toLowerCase()} template
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="csv_text" className="text-xs flex items-center gap-1.5">
                      <FileText className="size-3.5" /> Or paste CSV
                    </Label>
                    <Textarea
                      id="csv_text"
                      value={current.csvText}
                      onChange={(e) =>
                        update({ csvText: e.target.value, result: null })
                      }
                      placeholder={`${TEMPLATES[tab].header}\n...`}
                      className="h-48 font-mono text-[11px]"
                    />
                    <p className="text-[11px] text-slate-500">
                      First row must be the header with the column names shown
                      above.
                    </p>
                  </div>
                </div>

                {preview && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-700">
                        Preview ({Math.min(5, preview.totalRows)} of{" "}
                        {preview.totalRows} rows)
                      </p>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {preview.headers.length} columns
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {preview.headers.map((h) => (
                              <TableHead key={h} className="text-[11px]">
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.rows.map((r, i) => (
                            <TableRow key={i}>
                              {preview.headers.map((h) => (
                                <TableCell
                                  key={h}
                                  className="text-xs font-mono text-slate-700 max-w-60 truncate"
                                >
                                  {r[h] ?? ""}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {preview
                      ? `${preview.totalRows} row${
                          preview.totalRows === 1 ? "" : "s"
                        } ready to import`
                      : "No data loaded yet"}
                  </p>
                  <Button
                    onClick={submit}
                    disabled={current.submitting || !current.csvText.trim()}
                    className="gap-1.5 bg-linear-to-br from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                  >
                    {current.submitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Importing…
                      </>
                    ) : (
                      <>
                        Import {activeMeta.label.toLowerCase()}
                        <ArrowRight className="size-3.5" />
                      </>
                    )}
                  </Button>
                </div>

                {current.result && <ResultPanel result={current.result} />}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ResultPanel({ result }: { result: ImportResponse }) {
  const { inserted, failed, total, errors, entry } = result;
  const allGood = failed === 0 && inserted > 0;
  const anyOk = inserted > 0;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        allGood
          ? "border-emerald-200 bg-emerald-50/50"
          : anyOk
            ? "border-amber-200 bg-amber-50/50"
            : "border-rose-200 bg-rose-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-9 items-center justify-center rounded-xl shrink-0 ${
            allGood
              ? "bg-emerald-500 text-white"
              : anyOk
                ? "bg-amber-500 text-white"
                : "bg-rose-500 text-white"
          }`}
        >
          {allGood ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertTriangle className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {allGood
              ? "Import complete"
              : anyOk
                ? "Imported with some errors"
                : "Import failed"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="tabular-nums">
              <span className="font-semibold text-emerald-700">{inserted}</span>{" "}
              inserted
            </span>
            <span className="tabular-nums">
              <span className="font-semibold text-rose-700">{failed}</span>{" "}
              failed
            </span>
            <span className="tabular-nums">
              <span className="font-semibold text-slate-700">{total}</span>{" "}
              total
            </span>
            {entry && (
              <span className="tabular-nums">
                Journal{" "}
                <span className="font-mono font-semibold text-slate-700">
                  {entry.entry_number}
                </span>{" "}
                — KES {entry.total_debit.toLocaleString()}
              </span>
            )}
          </div>

          {errors.length > 0 && (
            <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-[11px]">Row</TableHead>
                    <TableHead className="text-[11px]">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs text-slate-500 tabular-nums">
                        {e.row}
                      </TableCell>
                      <TableCell className="text-xs text-rose-700">
                        {e.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
