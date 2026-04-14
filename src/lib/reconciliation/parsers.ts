// Statement parsers — CSV (generic) + M-Pesa (Safaricom statement export)

export type ParsedLine = {
  line_date: string;            // ISO YYYY-MM-DD
  description: string;
  reference: string | null;
  amount: number;                // + credit in, - debit out
  running_balance: number | null;
  payer_name: string | null;
  payer_phone: string | null;
};

function parseCSVRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
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
  // Accept: 2024-03-15, 15/03/2024, 15-03-2024, 2024/03/15, 2024-03-15 10:30:00
  const s = raw.trim().replace(/"/g, "");
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // fallback: Date parse
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function toNum(raw: string | undefined | null): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[,\s"]/g, "").replace(/^\((.*)\)$/, "-$1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Detect a phone number in M-Pesa details string (e.g. "254712345678")
function extractPhone(text: string): string | null {
  const m = text.match(/\b(?:254|\+254|0)[17]\d{8}\b/);
  return m ? m[0] : null;
}

// Extract payer name from M-Pesa details like:
//   "Funds received from 254712345678 JOHN DOE"
//   "Customer Transfer from 254712345678 - JOHN DOE"
function extractName(text: string): string | null {
  const m =
    text.match(/from\s+(?:254\d{9}|\+?\d{10,12})\s*[-–]?\s*([A-Z][A-Z\s.']{2,})/i) ||
    text.match(/to\s+(?:254\d{9}|\+?\d{10,12})\s*[-–]?\s*([A-Z][A-Z\s.']{2,})/i);
  return m ? m[1].trim() : null;
}

/**
 * Generic CSV parser. Expects columns (case-insensitive):
 *   date, description, reference, debit, credit, amount, balance
 * Either (debit & credit) OR (amount) is required.
 */
export function parseGenericCSV(text: string): ParsedLine[] {
  const rows = text.split(/\r?\n/).filter((r) => r.trim().length > 0);
  if (rows.length < 2) return [];

  const headers = parseCSVRow(rows[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const idx = (key: string) => headers.findIndex((h) => h.includes(key));

  const iDate = idx("date");
  const iDesc = idx("desc") >= 0 ? idx("desc") : idx("narration") >= 0 ? idx("narration") : idx("details");
  const iRef = idx("ref");
  const iDebit = idx("debit") >= 0 ? idx("debit") : idx("withdrawn");
  const iCredit = idx("credit") >= 0 ? idx("credit") : idx("paidin");
  const iAmt = idx("amount");
  const iBal = idx("balance");

  const out: ParsedLine[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = parseCSVRow(rows[i]);
    const date = toISO(cols[iDate] ?? "");
    if (!date) continue;

    let amount = 0;
    if (iAmt >= 0) {
      amount = toNum(cols[iAmt]);
    } else {
      const credit = iCredit >= 0 ? toNum(cols[iCredit]) : 0;
      const debit = iDebit >= 0 ? toNum(cols[iDebit]) : 0;
      amount = credit - Math.abs(debit);
    }
    if (amount === 0) continue;

    const description = (iDesc >= 0 ? cols[iDesc] : "") || "Bank transaction";

    out.push({
      line_date: date,
      description,
      reference: iRef >= 0 ? cols[iRef] || null : null,
      amount,
      running_balance: iBal >= 0 ? toNum(cols[iBal]) : null,
      payer_name: extractName(description),
      payer_phone: extractPhone(description),
    });
  }
  return out;
}

/**
 * M-Pesa Safaricom business statement CSV parser.
 * Typical headers:
 *   Receipt No., Completion Time, Details, Transaction Status, Paid In, Withdrawn, Balance
 */
export function parseMpesaCSV(text: string): ParsedLine[] {
  const rows = text.split(/\r?\n/).filter((r) => r.trim().length > 0);
  if (rows.length < 2) return [];

  const headers = parseCSVRow(rows[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const find = (...keys: string[]) => headers.findIndex((h) => keys.some((k) => h.includes(k)));

  const iReceipt = find("receiptno", "receipt");
  const iTime = find("completiontime", "time", "date");
  const iDetails = find("details", "description");
  const iStatus = find("status");
  const iPaidIn = find("paidin", "paid", "in");
  const iWithdrawn = find("withdrawn", "out");
  const iBalance = find("balance");

  const out: ParsedLine[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = parseCSVRow(rows[i]);
    const status = iStatus >= 0 ? (cols[iStatus] || "").toLowerCase() : "completed";
    if (status && status !== "completed") continue;

    const date = toISO(cols[iTime] ?? "");
    if (!date) continue;

    const paidIn = iPaidIn >= 0 ? toNum(cols[iPaidIn]) : 0;
    const withdrawn = iWithdrawn >= 0 ? toNum(cols[iWithdrawn]) : 0;
    const amount = paidIn - Math.abs(withdrawn);
    if (amount === 0) continue;

    const details = iDetails >= 0 ? cols[iDetails] : "";
    const receipt = iReceipt >= 0 ? cols[iReceipt] : null;

    out.push({
      line_date: date,
      description: details || "M-Pesa transaction",
      reference: receipt || null,
      amount,
      running_balance: iBalance >= 0 ? toNum(cols[iBalance]) : null,
      payer_name: extractName(details),
      payer_phone: extractPhone(details),
    });
  }
  return out;
}
