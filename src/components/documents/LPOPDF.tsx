"use client";

import { formatDate } from "@/lib/utils/helpers";

interface LPOItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface LPOPDFProps {
  lpo: {
    lpoNumber: string;
    issueDate: string;
    deliveryDate?: string;
    status: string;
    items: LPOItem[];
    subtotal: string | number;
    taxAmount: string | number;
    discount: string | number;
    total: string | number;
    notes?: string;
    terms?: string;
    supplierName?: string;
    supplierEmail?: string;
    supplierPhone?: string;
    supplierAddress?: string;
  };
  tenant: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    companyLogo?: string;
    kraPin?: string;
    currency: string;
    currencySymbol: string;
    termsAndConditions?: string;
  };
}

const fmt = (amount: string | number, symbol: string = "KSh") =>
  `${symbol} ${Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

export default function LPOPDF({ lpo, tenant }: LPOPDFProps) {
  const items = Array.isArray(lpo.items) ? lpo.items : [];
  const statusColors: Record<string, string> = {
    draft: "#94a3b8",
    sent: "#3b82f6",
    approved: "#22c55e",
    rejected: "#ef4444",
    cancelled: "#6b7280",
  };

  return (
    <div
      id="lpo-pdf"
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        width: "794px",
        minHeight: "1123px",
        backgroundColor: "#ffffff",
        padding: "48px",
        boxSizing: "border-box",
        color: "#1e293b",
        fontSize: "13px",
        lineHeight: "1.5",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
        <div>
          {tenant.companyLogo ? (
            <img src={tenant.companyLogo} alt="Logo" style={{ height: "60px", marginBottom: "12px", objectFit: "contain" }} />
          ) : (
            <div style={{
              width: "60px", height: "60px", backgroundColor: "#16a34a",
              borderRadius: "12px", display: "flex", alignItems: "center",
              justifyContent: "center", marginBottom: "12px",
            }}>
              <span style={{ color: "white", fontSize: "22px", fontWeight: "bold" }}>
                {tenant.companyName.charAt(0)}
              </span>
            </div>
          )}
          <div style={{ fontWeight: "700", fontSize: "18px", color: "#0f172a" }}>{tenant.companyName}</div>
          <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>{tenant.companyAddress}</div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>{tenant.companyPhone}</div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>{tenant.companyEmail}</div>
          {tenant.kraPin && <div style={{ color: "#64748b", fontSize: "12px" }}>KRA PIN: {tenant.kraPin}</div>}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "36px", fontWeight: "800", color: "#16a34a", letterSpacing: "-1px" }}>
            LOCAL PURCHASE ORDER
          </div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#475569", marginTop: "4px" }}>
            #{lpo.lpoNumber}
          </div>
          <div style={{
            display: "inline-block", marginTop: "8px", padding: "4px 12px",
            borderRadius: "20px", backgroundColor: statusColors[lpo.status] + "20",
            color: statusColors[lpo.status], fontWeight: "600",
            fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.5px",
          }}>
            {lpo.status}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "2px", backgroundColor: "#16a34a", marginBottom: "32px", borderRadius: "1px" }} />

      {/* Supplier & Dates */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: "8px" }}>
            Supplier / Vendor
          </div>
          <div style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>{lpo.supplierName}</div>
          {lpo.supplierAddress && <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>{lpo.supplierAddress}</div>}
          {lpo.supplierPhone && <div style={{ color: "#64748b", fontSize: "12px" }}>{lpo.supplierPhone}</div>}
          {lpo.supplierEmail && <div style={{ color: "#64748b", fontSize: "12px" }}>{lpo.supplierEmail}</div>}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
              LPO Date
            </div>
            <div style={{ fontWeight: "600", color: "#0f172a" }}>{formatDate(lpo.issueDate)}</div>
          </div>
          {lpo.deliveryDate && (
            <div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
                Expected Delivery
              </div>
              <div style={{ fontWeight: "600", color: "#16a34a" }}>{formatDate(lpo.deliveryDate)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr style={{ backgroundColor: "#16a34a" }}>
            {["#", "Description", "Qty", "Unit Price", "Tax %", "Total"].map((h, i) => (
              <th key={h} style={{
                padding: "10px 12px",
                textAlign: i === 0 || i === 2 || i === 4 ? "center" as const : i >= 3 ? "right" as const : "left" as const,
                color: "white", fontSize: "11px", fontWeight: "700",
                textTransform: "uppercase" as const, letterSpacing: "0.5px",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f0fdf4" : "#ffffff" }}>
              <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#1e293b", fontWeight: "500" }}>{item.description}</td>
              <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569" }}>{item.quantity}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>{fmt(item.unitPrice, tenant.currencySymbol)}</td>
              <td style={{ padding: "10px 12px", textAlign: "center", color: "#475569" }}>{item.taxRate}%</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: "600" }}>{fmt(item.total, tenant.currencySymbol)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
        <div style={{ width: "280px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ color: "#64748b" }}>Subtotal</span>
            <span style={{ fontWeight: "600" }}>{fmt(lpo.subtotal, tenant.currencySymbol)}</span>
          </div>
          {Number(lpo.discount) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ color: "#64748b" }}>Discount</span>
              <span style={{ fontWeight: "600", color: "#ef4444" }}>- {fmt(lpo.discount, tenant.currencySymbol)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ color: "#64748b" }}>Tax (VAT)</span>
            <span style={{ fontWeight: "600" }}>{fmt(lpo.taxAmount, tenant.currencySymbol)}</span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "10px 12px",
            backgroundColor: "#16a34a", borderRadius: "8px", marginTop: "8px",
          }}>
            <span style={{ color: "white", fontWeight: "700", fontSize: "14px" }}>TOTAL</span>
            <span style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>{fmt(lpo.total, tenant.currencySymbol)}</span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {lpo.notes && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "4px" }}>Notes</div>
          <div style={{ color: "#475569", fontSize: "12px" }}>{lpo.notes}</div>
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: "4px" }}>Terms & Conditions</div>
        <div style={{ color: "#475569", fontSize: "12px" }}>
          {lpo.terms || tenant.termsAndConditions || "Goods must be delivered as per specifications. Any variations must be approved in writing."}
        </div>
      </div>

      {/* Signature Lines */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "48px" }}>
        {["Prepared By", "Authorized By", "Received By"].map((label) => (
          <div key={label} style={{ textAlign: "center", width: "180px" }}>
            <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "8px" }}>
              <div style={{ fontSize: "11px", color: "#64748b" }}>{label}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Name & Date</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "16px", marginTop: "32px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>This is an official purchase order from {tenant.companyName}</div>
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{lpo.lpoNumber}</div>
      </div>
    </div>
  );
}