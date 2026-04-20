#!/usr/bin/env node
/**
 * Smoke seed — creates a fresh isolated tenant, exercises every module,
 * and reports per-step errors. Designed to be deletable in one cascade.
 *
 * Usage:  node scripts/smoke-seed.mjs
 * Cleanup: DELETE FROM tenants WHERE id = '<printed tenant id>';
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) throw new Error(".env.local not found");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

// ── Reporting ─────────────────────────────────────────────────────────
const results = []; // { step, ok, rows, error }
const errors = [];
let stepNum = 0;

async function step(name, fn) {
  stepNum += 1;
  const label = `${String(stepNum).padStart(2, "0")}. ${name}`;
  process.stdout.write(`${label.padEnd(50)} … `);
  const t0 = Date.now();
  try {
    const rows = await fn();
    const ms = Date.now() - t0;
    const count = Array.isArray(rows) ? rows.length : rows === undefined ? 0 : 1;
    console.log(`OK   (${count} rows, ${ms}ms)`);
    results.push({ step: name, ok: true, rows: count, ms });
    return rows;
  } catch (err) {
    const ms = Date.now() - t0;
    const msg = err?.message ?? String(err);
    const detail = err?.details ?? err?.hint ?? "";
    console.log(`FAIL (${ms}ms)`);
    console.log(`     → ${msg}${detail ? "\n       " + detail : ""}`);
    results.push({ step: name, ok: false, error: msg, ms });
    errors.push({ step: name, error: msg, detail, stack: err?.stack });
    return null;
  }
}

// thin wrapper: throws on supabase error so step() captures it
async function must(promise, context) {
  const { data, error } = await promise;
  if (error) {
    const e = new Error(`${context ?? "supabase error"}: ${error.message}`);
    e.details = error.details;
    e.hint = error.hint;
    throw e;
  }
  return data;
}

// ── Seed payload ─────────────────────────────────────────────────────
const stamp = Date.now().toString().slice(-8);
const TENANT_NAME = `Smoke Test ${stamp}`;
const TENANT_EMAIL = `smoke+${stamp}@example.local`;
const ADMIN_EMAIL = `admin+${stamp}@example.local`;

// ── Seed workflow ────────────────────────────────────────────────────
const ctx = {
  tenantId: null,
  userId: null,
  warehouseId: null,
  categoryIds: [],
  productIds: [],
  customerIds: [],
  supplierIds: [],
  invoiceIds: [],
  quoteIds: [],
  poIds: [],
  employeeIds: [],
  accountIds: {}, // code → id
};

async function run() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║          KENYA ERP — SMOKE SEED                    ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  // ── 1. Tenant via RPC ──
  await step("Create tenant (register_company RPC)", async () => {
    const pwHash = await bcrypt.hash("smoketest1234", 10);
    const data = await must(
      db.rpc("register_company", {
        p_company_name: TENANT_NAME,
        p_company_email: TENANT_EMAIL,
        p_company_phone: "+254700000000",
        p_admin_name: "Smoke Admin",
        p_admin_email: ADMIN_EMAIL,
        p_password_hash: pwHash,
        p_country: "Kenya",
        p_kra_pin: "P123456789A",
      }),
      "register_company"
    );
    const row = Array.isArray(data) ? data[0] : data;
    ctx.tenantId = row.tenant_id;
    ctx.userId = row.user_id;
    return row;
  });

  if (!ctx.tenantId) {
    console.error("\n⚠ Cannot continue — tenant creation failed.");
    return;
  }

  console.log(`\n   tenant_id = ${ctx.tenantId}`);
  console.log(`   admin_id  = ${ctx.userId}\n`);

  // ── 2. Chart of Accounts (already seeded by register_company; just fetch) ──
  await step("Fetch chart of accounts", async () => {
    const accts = await must(
      db.from("accounts").select("id, code").eq("tenant_id", ctx.tenantId),
      "fetch accounts"
    );
    for (const a of accts) ctx.accountIds[a.code] = a.id;
    return accts;
  });

  // ── 3. Warehouses (register_company already created 'Main Warehouse') ──
  await step("Create warehouses", async () => {
    const existing = await must(
      db.from("warehouses").select("id, is_default").eq("tenant_id", ctx.tenantId),
      "fetch existing warehouses"
    );
    const defaultWh = existing.find((w) => w.is_default) ?? existing[0];
    ctx.warehouseId = defaultWh?.id ?? null;
    const rows = await must(
      db.from("warehouses").insert([
        { tenant_id: ctx.tenantId, name: "Mombasa Branch", location: "Mombasa", is_default: false, is_active: true },
      ]).select(),
      "insert warehouses"
    );
    return rows;
  });

  // ── 4. Categories ──
  await step("Create product categories", async () => {
    const rows = await must(
      db.from("categories").insert([
        { tenant_id: ctx.tenantId, name: "Electronics" },
        { tenant_id: ctx.tenantId, name: "Office Supplies" },
        { tenant_id: ctx.tenantId, name: "Furniture" },
        { tenant_id: ctx.tenantId, name: "Consumables" },
      ]).select(),
      "insert categories"
    );
    ctx.categoryIds = rows.map((r) => r.id);
    return rows;
  });

  // ── 5. Products ──
  await step("Create products", async () => {
    const data = [
      { sku: "LAP-001", name: "Dell Latitude 5420", unit: "unit", cost_price: 85000, selling_price: 120000, vat_rate: 16, reorder_level: 2 },
      { sku: "CHR-001", name: "Executive Office Chair", unit: "unit", cost_price: 15000, selling_price: 25000, vat_rate: 16, reorder_level: 5 },
      { sku: "DSK-001", name: "Standing Desk", unit: "unit", cost_price: 35000, selling_price: 55000, vat_rate: 16, reorder_level: 3 },
      { sku: "PRN-001", name: "HP LaserJet Pro", unit: "unit", cost_price: 22000, selling_price: 35000, vat_rate: 16, reorder_level: 2 },
      { sku: "PPR-001", name: "A4 Paper Ream", unit: "ream", cost_price: 450, selling_price: 700, vat_rate: 16, reorder_level: 50 },
      { sku: "PEN-001", name: "Ballpoint Pen (12)", unit: "pack", cost_price: 120, selling_price: 250, vat_rate: 16, reorder_level: 100 },
      { sku: "TNR-001", name: "HP Toner Cartridge", unit: "unit", cost_price: 6500, selling_price: 9500, vat_rate: 16, reorder_level: 10 },
      { sku: "USB-001", name: "USB Flash Drive 32GB", unit: "unit", cost_price: 800, selling_price: 1500, vat_rate: 16, reorder_level: 20 },
    ];
    const rows = await must(
      db.from("products").insert(
        data.map((p, i) => ({
          ...p, tenant_id: ctx.tenantId,
          category_id: ctx.categoryIds[i % ctx.categoryIds.length],
          is_active: true,
        }))
      ).select(),
      "insert products"
    );
    ctx.productIds = rows.map((r) => r.id);
    return rows;
  });

  // ── 6. Stock levels ──
  await step("Seed stock levels", async () => {
    const data = ctx.productIds.map((pid) => ({
      tenant_id: ctx.tenantId, product_id: pid,
      warehouse_id: ctx.warehouseId, quantity: Math.floor(Math.random() * 50) + 10,
    }));
    return await must(db.from("stock_levels").insert(data).select(), "stock_levels");
  });

  // ── 7. Customers ──
  await step("Create customers", async () => {
    const rows = await must(
      db.from("customers").insert([
        { tenant_id: ctx.tenantId, name: "Acme Industries Ltd", email: "ops@acme.co.ke", phone: "+254711000001", kra_pin: "P051234001A", credit_limit: 500000 },
        { tenant_id: ctx.tenantId, name: "Bidii Agro Suppliers", email: "info@bidii.co.ke", phone: "+254711000002", kra_pin: "P051234002B", credit_limit: 300000 },
        { tenant_id: ctx.tenantId, name: "Coastal Trading Co.", email: "finance@coastal.co.ke", phone: "+254711000003", kra_pin: "P051234003C", credit_limit: 750000 },
        { tenant_id: ctx.tenantId, name: "Dawa Pharmaceuticals", email: "accounts@dawa.co.ke", phone: "+254711000004", kra_pin: "P051234004D", credit_limit: 200000 },
        { tenant_id: ctx.tenantId, name: "Eagle Construction Ltd", email: "po@eagle.co.ke", phone: "+254711000005", kra_pin: "P051234005E", credit_limit: 1000000 },
      ]).select(),
      "insert customers"
    );
    ctx.customerIds = rows.map((r) => r.id);
    return rows;
  });

  // ── 8. Suppliers ──
  await step("Create suppliers", async () => {
    const rows = await must(
      db.from("suppliers").insert([
        { tenant_id: ctx.tenantId, name: "Mwangi Wholesale", email: "mwangi@ws.co.ke", phone: "+254722000001", payment_terms: 30 },
        { tenant_id: ctx.tenantId, name: "Kibera Tech Imports", email: "sales@kiberatech.co.ke", phone: "+254722000002", payment_terms: 15 },
        { tenant_id: ctx.tenantId, name: "Jua Kali Metalworks", email: "jua@metal.co.ke", phone: "+254722000003", payment_terms: 7 },
        { tenant_id: ctx.tenantId, name: "Savannah Logistics", email: "ops@savannah.co.ke", phone: "+254722000004", payment_terms: 45 },
        { tenant_id: ctx.tenantId, name: "Equator Printing Press", email: "print@equator.co.ke", phone: "+254722000005", payment_terms: 30 },
      ]).select(),
      "insert suppliers"
    );
    ctx.supplierIds = rows.map((r) => r.id);
    return rows;
  });

  // ── 9. Bank accounts + payment channels ──
  await step("Create bank accounts", async () => {
    return await must(
      db.from("bank_accounts").insert([
        { tenant_id: ctx.tenantId, bank_name: "Equity Bank", account_name: TENANT_NAME, account_number: "0100123456789", branch: "Upper Hill", is_default: true },
        { tenant_id: ctx.tenantId, bank_name: "KCB", account_name: TENANT_NAME, account_number: "1100876543210", branch: "Westlands", is_default: false },
      ]).select(),
      "insert bank_accounts"
    );
  });

  await step("Create payment channels", async () => {
    return await must(
      db.from("payment_channels").insert([
        { tenant_id: ctx.tenantId, name: "Office Cash", channel_type: "cash", is_default: true, is_active: true },
        { tenant_id: ctx.tenantId, name: "M-Pesa Till 555000", channel_type: "mpesa_till", mpesa_shortcode: "555000", is_default: false, is_active: true },
        { tenant_id: ctx.tenantId, name: "M-Pesa Paybill 123456", channel_type: "mpesa_paybill", mpesa_shortcode: "123456", mpesa_account_template: "{invoice_number}", is_default: false, is_active: true },
        { tenant_id: ctx.tenantId, name: "Equity Bank Transfer", channel_type: "bank", is_default: false, is_active: true },
      ]).select(),
      "insert payment_channels"
    );
  });

  // ── 10. Employees ──
  await step("Create employees", async () => {
    const rows = await must(
      db.from("employees").insert([
        { tenant_id: ctx.tenantId, employee_number: "EMP001", full_name: "Jane Wanjiku", email: "jane@co.ke", phone: "+254733000001", id_number: "12345678", kra_pin: "A001234567B", nssf_number: "NSS001", nhif_number: "NHI001", department: "Finance", designation: "Accountant", employment_type: "permanent", basic_salary: 85000, hire_date: "2024-01-15", is_active: true },
        { tenant_id: ctx.tenantId, employee_number: "EMP002", full_name: "Peter Omondi", email: "peter@co.ke", phone: "+254733000002", id_number: "23456789", kra_pin: "A002345678C", nssf_number: "NSS002", nhif_number: "NHI002", department: "Sales", designation: "Sales Rep", employment_type: "permanent", basic_salary: 60000, hire_date: "2024-03-01", is_active: true },
        { tenant_id: ctx.tenantId, employee_number: "EMP003", full_name: "Grace Mutua", email: "grace@co.ke", phone: "+254733000003", id_number: "34567890", kra_pin: "A003456789D", nssf_number: "NSS003", nhif_number: "NHI003", department: "Warehouse", designation: "Store Keeper", employment_type: "contract", basic_salary: 45000, hire_date: "2025-06-01", is_active: true },
      ]).select(),
      "insert employees"
    );
    ctx.employeeIds = rows.map((r) => r.id);
    return rows;
  });

  // ── 11. Invoices + items ──
  await step("Create invoices + line items", async () => {
    const created = [];
    for (let i = 0; i < 5; i++) {
      const customerId = ctx.customerIds[i % ctx.customerIds.length];
      const subtotal = 50000 + i * 15000;
      const tax = subtotal * 0.16;
      const total = subtotal + tax;
      const statuses = ["draft", "sent", "partial", "paid", "sent"];
      const inv = (await must(
        db.from("invoices").insert({
          tenant_id: ctx.tenantId,
          invoice_number: `INV-2026-00${i + 1}`,
          customer_id: customerId,
          issue_date: new Date(Date.now() - (5 - i) * 86400000).toISOString().slice(0, 10),
          due_date: new Date(Date.now() + (25 - i) * 86400000).toISOString().slice(0, 10),
          status: statuses[i],
          subtotal, tax_amount: tax, discount_amount: 0, total_amount: total,
          amount_paid: statuses[i] === "paid" ? total : statuses[i] === "partial" ? total / 2 : 0,
          created_by: ctx.userId,
        }).select().single(),
        "insert invoice"
      ));
      ctx.invoiceIds.push(inv.id);
      await must(
        db.from("invoice_items").insert([
          { tenant_id: ctx.tenantId, invoice_id: inv.id, product_id: ctx.productIds[0], description: "Laptop", quantity: 1, unit_price: 120000, vat_rate: 16, vat_amount: 19200, line_total: 139200, sort_order: 1 },
          { tenant_id: ctx.tenantId, invoice_id: inv.id, product_id: ctx.productIds[4], description: "A4 paper", quantity: 10, unit_price: 700, vat_rate: 16, vat_amount: 1120, line_total: 8120, sort_order: 2 },
        ]),
        "insert invoice_items"
      );
      created.push(inv);
    }
    return created;
  });

  // ── 12. Quotes ──
  await step("Create quotes + items", async () => {
    const created = [];
    for (let i = 0; i < 3; i++) {
      const q = await must(
        db.from("quotes").insert({
          tenant_id: ctx.tenantId,
          quote_number: `QT-2026-00${i + 1}`,
          customer_id: ctx.customerIds[i],
          issue_date: new Date().toISOString().slice(0, 10),
          expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          status: ["draft", "sent", "accepted"][i],
          subtotal: 40000, tax_amount: 6400, total_amount: 46400,
          created_by: ctx.userId,
        }).select().single(),
        "insert quote"
      );
      ctx.quoteIds.push(q.id);
      await must(
        db.from("quote_items").insert([
          { tenant_id: ctx.tenantId, quote_id: q.id, description: "Chair", quantity: 2, unit_price: 20000, vat_rate: 16, vat_amount: 6400, line_total: 46400, sort_order: 1 },
        ]),
        "insert quote_items"
      );
      created.push(q);
    }
    return created;
  });

  // ── 13. Credit notes ──
  await step("Create credit notes + items", async () => {
    const created = [];
    for (let i = 0; i < 2; i++) {
      const cn = await must(
        db.from("credit_notes").insert({
          tenant_id: ctx.tenantId,
          credit_note_number: `CN-2026-00${i + 1}`,
          invoice_id: ctx.invoiceIds[i],
          customer_id: ctx.customerIds[i],
          issue_date: new Date().toISOString().slice(0, 10),
          reason: "Returned goods — damaged in transit",
          status: ["draft", "approved"][i],
          subtotal: 10000, tax_amount: 1600, total_amount: 11600,
          created_by: ctx.userId,
        }).select().single(),
        "insert credit_note"
      );
      await must(
        db.from("credit_note_items").insert([
          { tenant_id: ctx.tenantId, credit_note_id: cn.id, description: "Damaged unit refund", quantity: 1, unit_price: 10000, vat_rate: 16, vat_amount: 1600, line_total: 11600, sort_order: 1 },
        ]),
        "insert credit_note_items"
      );
      created.push(cn);
    }
    return created;
  });

  // ── 14. Delivery notes ──
  await step("Create delivery notes", async () => {
    const created = [];
    for (let i = 0; i < 2; i++) {
      const dn = await must(
        db.from("delivery_notes").insert({
          tenant_id: ctx.tenantId,
          dn_number: `DN-2026-00${i + 1}`,
          delivery_note_number: `DN-2026-00${i + 1}`,
          invoice_id: ctx.invoiceIds[i],
          status: ["pending", "delivered"][i],
          driver_name: "John Kamau",
          vehicle_reg: "KDA 123A",
          created_by: ctx.userId,
        }).select().single(),
        "insert delivery_note"
      );
      created.push(dn);
    }
    return created;
  });

  // ── 15. Purchase Orders ──
  await step("Create purchase orders + items", async () => {
    const created = [];
    for (let i = 0; i < 3; i++) {
      const po = await must(
        db.from("purchase_orders").insert({
          tenant_id: ctx.tenantId,
          lpo_number: `LPO-2026-00${i + 1}`,
          supplier_id: ctx.supplierIds[i],
          issue_date: new Date().toISOString().slice(0, 10),
          expected_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          status: ["draft", "approved", "received"][i],
          subtotal: 100000, tax_amount: 16000, total_amount: 116000,
          created_by: ctx.userId,
        }).select().single(),
        "insert purchase_order"
      );
      ctx.poIds.push(po.id);
      await must(
        db.from("purchase_order_items").insert([
          { tenant_id: ctx.tenantId, po_id: po.id, product_id: ctx.productIds[0], description: "Laptop bulk", quantity: 5, unit_price: 85000, vat_rate: 16, vat_amount: 68000, line_total: 493000, sort_order: 1 },
        ]),
        "insert purchase_order_items"
      );
      created.push(po);
    }
    return created;
  });

  // ── 16. GRNs ──
  await step("Create goods received notes", async () => {
    const created = [];
    for (let i = 0; i < 2; i++) {
      const grn = await must(
        db.from("goods_received_notes").insert({
          tenant_id: ctx.tenantId,
          grn_number: `GRN-2026-00${i + 1}`,
          po_id: ctx.poIds[i],
          supplier_id: ctx.supplierIds[i],
          warehouse_id: ctx.warehouseId,
          received_date: new Date().toISOString().slice(0, 10),
          status: "complete",
          created_by: ctx.userId,
        }).select().single(),
        "insert goods_received_notes"
      );
      await must(
        db.from("grn_items").insert([
          { tenant_id: ctx.tenantId, grn_id: grn.id, product_id: ctx.productIds[0], quantity_ordered: 5, quantity_received: 5, unit_price: 85000 },
        ]),
        "insert grn_items"
      );
      created.push(grn);
    }
    return created;
  });

  // ── 17. Stock movements ──
  await step("Create stock movements", async () => {
    const rows = ctx.productIds.slice(0, 4).map((pid, i) => ({
      tenant_id: ctx.tenantId, product_id: pid, warehouse_id: ctx.warehouseId,
      type: i % 2 === 0 ? "in" : "out",
      quantity: i % 2 === 0 ? 10 : 2,
      unit_cost: 1000 * (i + 1),
      reference_type: "manual", notes: `Smoke test movement ${i}`,
      created_by: ctx.userId,
    }));
    return await must(db.from("stock_movements").insert(rows).select(), "stock_movements");
  });

  // ── 18. Expenses ──
  await step("Create expenses", async () => {
    const categories = ["Office Supplies", "Utilities", "Travel & Transport", "Rent", "Marketing & Advertising"];
    const methods = ["cash", "mpesa", "bank_transfer", "cheque", "card"];
    const rows = Array.from({ length: 5 }, (_, i) => ({
      tenant_id: ctx.tenantId,
      expense_number: `EXP-2026-00${i + 1}`,
      category: categories[i],
      amount: 5000 * (i + 1),
      description: `${categories[i]} expense ${i + 1}`,
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: methods[i],
      status: ["pending", "approved", "pending", "approved", "rejected"][i],
      created_by: ctx.userId,
    }));
    return await must(db.from("expenses").insert(rows).select(), "expenses");
  });

  // ── 19. Journal entry ──
  await step("Create manual journal entry", async () => {
    const cashAcc = ctx.accountIds["1000"] ?? Object.values(ctx.accountIds)[0];
    const salesAcc = Object.entries(ctx.accountIds).find(([c]) => c.startsWith("4"))?.[1];
    if (!cashAcc || !salesAcc) throw new Error("Missing required accounts — chart of accounts incomplete");
    const entry = await must(
      db.from("journal_entries").insert({
        tenant_id: ctx.tenantId,
        entry_number: "JE-2026-001",
        description: "Smoke test adjustment",
        entry_date: new Date().toISOString().slice(0, 10),
        is_posted: true, created_by: ctx.userId,
      }).select().single(),
      "insert journal_entry"
    );
    await must(
      db.from("journal_entry_lines").insert([
        { tenant_id: ctx.tenantId, entry_id: entry.id, account_id: cashAcc, debit: 50000, credit: 0, description: "Cash" },
        { tenant_id: ctx.tenantId, entry_id: entry.id, account_id: salesAcc, debit: 0, credit: 50000, description: "Sales" },
      ]),
      "insert journal_entry_lines"
    );
    return entry;
  });

  // ── 20. Leave requests ──
  await step("Create leave requests", async () => {
    const today = new Date();
    const rows = [
      { tenant_id: ctx.tenantId, employee_id: ctx.employeeIds[0], leave_type: "annual", start_date: new Date(today.getTime() + 7*86400000).toISOString().slice(0,10), end_date: new Date(today.getTime() + 14*86400000).toISOString().slice(0,10), days_requested: 8, reason: "Family trip", status: "pending" },
      { tenant_id: ctx.tenantId, employee_id: ctx.employeeIds[1], leave_type: "sick", start_date: today.toISOString().slice(0,10), end_date: new Date(today.getTime() + 2*86400000).toISOString().slice(0,10), days_requested: 3, reason: "Flu", status: "approved", approved_by: ctx.userId },
    ];
    return await must(db.from("leave_requests").insert(rows).select(), "leave_requests");
  });
}

// ── Main ─────────────────────────────────────────────────────────────
try {
  await run();
} catch (err) {
  console.error("\n! Fatal:", err);
}

// ── Summary ──────────────────────────────────────────────────────────
const okCount = results.filter((r) => r.ok).length;
const failCount = results.filter((r) => !r.ok).length;
const totalRows = results.reduce((s, r) => s + (r.rows ?? 0), 0);
const totalMs = results.reduce((s, r) => s + (r.ms ?? 0), 0);

console.log("\n╔════════════════════════════════════════════════════╗");
console.log("║                   SUMMARY                          ║");
console.log("╚════════════════════════════════════════════════════╝");
console.log(`  steps passed : ${okCount}/${results.length}`);
console.log(`  steps failed : ${failCount}`);
console.log(`  rows seeded  : ${totalRows}`);
console.log(`  total time   : ${totalMs} ms`);

if (ctx.tenantId) {
  console.log(`\n  tenant_id    : ${ctx.tenantId}`);
  console.log(`\n  Cleanup SQL:`);
  console.log(`    DELETE FROM tenants WHERE id = '${ctx.tenantId}';`);
}

// ── Error log ────────────────────────────────────────────────────────
const logsDir = resolve(ROOT, "logs");
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
const logPath = resolve(logsDir, `smoke-seed-${stamp}.log`);

const report = {
  timestamp: new Date().toISOString(),
  tenant_id: ctx.tenantId,
  summary: { ok: okCount, failed: failCount, rows: totalRows, ms: totalMs },
  steps: results,
  errors,
};
writeFileSync(logPath, JSON.stringify(report, null, 2));
console.log(`\n  full log     : ${logPath}`);

process.exit(failCount > 0 ? 1 : 0);
