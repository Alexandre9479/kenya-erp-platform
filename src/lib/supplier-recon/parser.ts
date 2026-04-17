// Supplier statement CSV parser.
// Expected columns (case-insensitive, flexible):
//   date, doc_number (or invoice/document), description, debit, credit, balance

export type SupplierLine = {
  line_date: string;
  document_type: "invoice" | "credit_note" | "payment" | "opening" | "adjustment";
  document_number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  running_balance: number | null;
};

function parseCSVRow(row: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"' && row[i + 1] === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toISO(raw: string): string {
  if (!raw) return "";
  const s = raw.trim().replace(/"/g, "");
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function toNum(raw: string | undefined | null): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[,\s"]/g, "").replace(/^\((.*)\)$/, "-$1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function guessDocType(docNumber: string, description: string): SupplierLine["document_type"] {
  const text = `${docNumber ?? ""} ${description ?? ""}`.toLowerCase();
  if (/credit\s*note|\bcn[-\s/]/i.test(text)) return "credit_note";
  if (/payment|receipt|paid|cheque|rtgs|mpesa|transfer/i.test(text)) return "payment";
  if (/opening\s*balance|b\/f|brought\s*forward/i.test(text)) return "opening";
  if (/adjustment|write[-\s]*off/i.test(text)) return "adjustment";
  return "invoice";
}

export function parseSupplierCSV(text: string): SupplierLine[] {
  const rows = text.split(/\r?\n/).filter((r) => r.trim().length > 0);
  if (rows.length < 2) return [];

  const headers = parseCSVRow(rows[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const idx = (...keys: string[]) => headers.findIndex((h) => keys.some((k) => h.includes(k)));

  const iDate = idx("date");
  const iDoc = idx("invoice", "docnumber", "document", "docno", "ref");
  const iDesc = idx("desc", "narration", "details", "particulars");
  const iDebit = idx("debit");
  const iCredit = idx("credit");
  const iBal = idx("balance");
  const iAmt = idx("amount");

  const out: SupplierLine[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = parseCSVRow(rows[i]);
    const date = toISO(cols[iDate] ?? "");
    if (!date) continue;

    let debit = 0, credit = 0;
    if (iDebit >= 0 || iCredit >= 0) {
      debit = iDebit >= 0 ? toNum(cols[iDebit]) : 0;
      credit = iCredit >= 0 ? toNum(cols[iCredit]) : 0;
    } else if (iAmt >= 0) {
      const amt = toNum(cols[iAmt]);
      if (amt >= 0) debit = amt;
      else credit = Math.abs(amt);
    }
    if (debit === 0 && credit === 0) continue;

    const docNumber = iDoc >= 0 ? cols[iDoc] || null : null;
    const description = iDesc >= 0 ? cols[iDesc] || null : null;

    out.push({
      line_date: date,
      document_type: guessDocType(docNumber ?? "", description ?? ""),
      document_number: docNumber,
      description,
      debit,
      credit,
      running_balance: iBal >= 0 ? toNum(cols[iBal]) : null,
    });
  }
  return out;
}
