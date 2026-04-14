// Auto-match engine: match unmatched bank_statement_lines to receipts/expenses
// Confidence scoring:
//   95+  exact amount + reference contains doc number + date ±3d
//   80+  exact amount + date ±7d
//   60+  exact amount + date ±14d
//   <60  not auto-matched (user must pick)

type Line = {
  id: string;
  line_date: string;
  amount: number;
  description: string | null;
  reference: string | null;
  payer_phone: string | null;
};

type Receipt = {
  id: string;
  receipt_number: string;
  amount: number | string;
  payment_date: string;
  reference: string | null;
  customer_id: string;
};

type Expense = {
  id: string;
  expense_number: string;
  amount: number | string;
  expense_date: string;
  reference: string | null;
};

const daysBetween = (a: string, b: string) =>
  Math.abs(Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000));

const containsRef = (text: string | null, needle: string | null) => {
  if (!text || !needle) return false;
  return text.toLowerCase().includes(needle.toLowerCase());
};

export type Match = {
  lineId: string;
  targetId: string;
  type: "receipt" | "expense";
  confidence: number;
};

export function autoMatch(
  lines: Line[],
  receipts: Receipt[],
  expenses: Expense[]
): Match[] {
  const matches: Match[] = [];
  const usedReceipts = new Set<string>();
  const usedExpenses = new Set<string>();

  // Sort lines by amount size (larger first — safer matches)
  const sortedLines = [...lines].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  for (const line of sortedLines) {
    const isCredit = line.amount > 0;
    const absAmt = Math.abs(line.amount);
    const text = `${line.description ?? ""} ${line.reference ?? ""}`;

    let best: Match | null = null;

    if (isCredit) {
      // Match against receipts (customer payments received)
      for (const r of receipts) {
        if (usedReceipts.has(r.id)) continue;
        const rAmt = Number(r.amount);
        if (Math.abs(rAmt - absAmt) > 0.01) continue;

        const days = daysBetween(line.line_date, r.payment_date);
        let conf = 0;
        if (containsRef(text, r.receipt_number) || containsRef(text, r.reference)) {
          conf = days <= 3 ? 98 : days <= 7 ? 92 : 85;
        } else if (days <= 3) {
          conf = 85;
        } else if (days <= 7) {
          conf = 75;
        } else if (days <= 14) {
          conf = 60;
        } else {
          continue;
        }

        if (!best || conf > best.confidence) {
          best = { lineId: line.id, targetId: r.id, type: "receipt", confidence: conf };
        }
      }
    } else {
      // Match against expenses (money going out)
      for (const e of expenses) {
        if (usedExpenses.has(e.id)) continue;
        const eAmt = Number(e.amount);
        if (Math.abs(eAmt - absAmt) > 0.01) continue;

        const days = daysBetween(line.line_date, e.expense_date);
        let conf = 0;
        if (containsRef(text, e.expense_number) || containsRef(text, e.reference)) {
          conf = days <= 3 ? 98 : days <= 7 ? 92 : 85;
        } else if (days <= 3) {
          conf = 80;
        } else if (days <= 7) {
          conf = 70;
        } else if (days <= 14) {
          conf = 55;
        } else {
          continue;
        }

        if (!best || conf > best.confidence) {
          best = { lineId: line.id, targetId: e.id, type: "expense", confidence: conf };
        }
      }
    }

    if (best && best.confidence >= 80) {
      matches.push(best);
      if (best.type === "receipt") usedReceipts.add(best.targetId);
      else usedExpenses.add(best.targetId);
    }
  }

  return matches;
}
