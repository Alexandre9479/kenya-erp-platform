// Minimal RFC-4180 CSV parser — handles quoted fields, escaped quotes, embedded commas.
// Returns rows of string[]. Blank trailing lines are skipped.

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  if (!text) return rows;

  const src = text.replace(/\r\n?/g, "\n");
  let cur = "";
  let row: string[] = [];
  let inQ = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQ) {
      if (c === '"' && src[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        cur += c;
      }
      continue;
    }
    if (c === '"') {
      inQ = true;
      continue;
    }
    if (c === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (c === "\n") {
      row.push(cur);
      cur = "";
      if (row.length > 1 || row[0]!.trim() !== "") rows.push(row);
      row = [];
      continue;
    }
    cur += c;
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    if (row.length > 1 || row[0]!.trim() !== "") rows.push(row);
  }

  return rows;
}

// Parses CSV text into an array of objects keyed by header row. Header is trimmed + lowercased.
export function parseCSVToObjects(
  text: string
): { headers: string[]; rows: Record<string, string>[] } {
  const raw = parseCSV(text);
  if (raw.length === 0) return { headers: [], rows: [] };
  const headerRow = raw[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const data = raw.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headerRow.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers: headerRow, rows: data };
}

// Cast helpers
export function toNumber(v: string | undefined | null): number {
  if (!v) return 0;
  const cleaned = String(v).replace(/[,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

export function orNull(v: string | undefined | null): string | null {
  const s = (v ?? "").trim();
  return s.length === 0 ? null : s;
}
