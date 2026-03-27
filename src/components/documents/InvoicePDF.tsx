"use client";

import { formatDate } from "@/lib/utils/helpers";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    status: string;
    items: InvoiceItem[];
    subtotal: string | number;
    taxAmount: string | number;
    discount: string | number;
    total: string | number;
    amountPaid: string | number;
    amountDue: string | number;
    notes?: string;
    terms?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
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
    bankDetails?: Array<{
      bankName: string;
      accountName: string;
      accountNumber: string;
      branchName?: string;
    }>;
    termsAndConditions?: string;
  };
}

const fmt = (amount: string | number, symbol: string = "KSh") =>
  `${symbol} ${Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

export default function InvoicePDF({ invoice, tenant }: InvoicePDFProps) {
  const statusColors: Record<string, string> = {
    draft: "#94a3b8",
    sent: "#3b82f6",
    paid: "#22c55e",
    partial: "#f59e0b",
    overdue: "#ef4444",
    cancelled: "#6b7280",
  };

  const items = Array.isArray(invoice.items) ? invoice.items : [];

  return (
    <div
      id="invoice-pdf"
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
        {/* Company Info */}
        <div>
          {tenant.companyLogo ? (
            <img src={tenant.companyLogo} alt="Logo" style={{ height: "60px", marginBottom: "12px", objectFit: "contain" }} />
          ) : (
            <div style={{
              width: "60px", height: "60px", backgroundColor: "#1e40af",
              borderRadius: "12px", display: "flex", alignItems: "center",
              justifyContent: "center", marginBottom: "12px",
            }}>
              <span style={{ color: "white", fontSize: "22px", fontWeight: "bold" }}>
                {tenant.companyName.charAt(0)}
              </span>
            </div>
          )}
          <div style={{ fontWeight: "700", fontSize: "18px", color: "#0f172a" }}>
            {tenant.companyName}
          </div>
          <div style={{ color: "#64748b", marginTop: "4px", fontSize: "12px" }}>
            {tenant.companyAddress}
          </div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>{tenant.companyPhone}</div>
          <div style={{ color: "#64748b", fontSize: "12px" }}>{tenant.companyEmail}</div>
          {tenant.kraPin && (
            <div style={{ color: "#64748b", fontSize: "12px" }}>KRA PIN: {tenant.kraPin}</div>
          )}
        </div>

        {/* Invoice Title & Number */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "36px", fontWeight: "800", color: "#1e40af", letterSpacing: "-1px" }}>
            INVOICE
          </div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#475569", marginTop: "4px" }}>
            #{invoice.invoiceNumber}
          </div>
          <div style={{
            display: "inline-block",
            marginTop: "8px",
            padding: "4px 12px",
            borderRadius: "20px",
            backgroundColor: statusColors[invoice.status] + "20",
            color: statusColors[invoice.status],
            fontWeight: "600",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            {invoice.status}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "2px", backgroundColor: "#1e40af", marginBottom: "32px", borderRadius: "1px" }} />

      {/* Bill To & Dates */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
        {/* Bill To */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Bill To
          </div>
          <div style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>
            {invoice.customerName}
          </div>
          {invoice.customerAddress && (
            <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
              {invoice.customerAddress}
            </div>
          )}
          {invoice.customerPhone && (
            <div style={{ color: "#64748b", fontSize: "12px" }}>{invoice.customerPhone}</div>
          )}
          {invoice.customerEmail && (
            <div style={{ color: "#64748b", fontSize: "12px" }}>{invoice.customerEmail}</div>
          )}
        </div>

        {/* Dates */}
        <div style={{ textAlign: "right" }}>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
              Issue Date
            </div>
            <div style={{ fontWeight: "600", color: "#0f172a" }}>
              {formatDate(invoice.issueDate)}
            </div>
          </div>
          {invoice.dueDate && (
            <div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
                Due Date
              </div>
              <div style={{ fontWeight: "600", color: "#ef4444" }}>
                {formatDate(invoice.dueDate)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
        <thead>
          <tr style={{ backgroundColor: "#1e40af" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "white", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", borderRadius: "0" }}>
              #
            </th>
            <th style={{ padding: "10px 12px", textAlign: "left", color: "white", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Description
            </th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "white", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Qty
            </th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "white", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Unit Price
            </th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "white", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Tax
            </th>
            <th style={{ padding: "10px 12px", textAlign: "right", color: "white", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff" }}>
              <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "12px" }}>{i + 1}</td>
              <td style={{ padding: "10px 12px", color: "#1e293b", fontWeight: "500" }}>
                {item.description}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>
                {item.quantity}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>
                {fmt(item.unitPrice, tenant.currencySymbol)}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#475569" }}>
                {item.taxRate}%
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: "600" }}>
                {fmt(item.total, tenant.currencySymbol)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
        <div style={{ width: "280px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ color: "#64748b" }}>Subtotal</span>
            <span style={{ fontWeight: "600" }}>{fmt(invoice.subtotal, tenant.currencySymbol)}</span>
          </div>
          {Number(invoice.discount) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ color: "#64748b" }}>Discount</span>
              <span style={{ fontWeight: "600", color: "#ef4444" }}>
                - {fmt(invoice.discount, tenant.currencySymbol)}
              </span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ color: "#64748b" }}>Tax (VAT)</span>
            <span style={{ fontWeight: "600" }}>{fmt(invoice.taxAmount, tenant.currencySymbol)}</span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "10px 12px",
            backgroundColor: "#1e40af", borderRadius: "8px", marginTop: "8px",
          }}>
            <span style={{ color: "white", fontWeight: "700", fontSize: "14px" }}>TOTAL</span>
            <span style={{ color: "white", fontWeight: "800", fontSize: "16px" }}>
              {fmt(invoice.total, tenant.currencySymbol)}
            </span>
          </div>
          {Number(invoice.amountPaid) > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", marginTop: "8px" }}>
                <span style={{ color: "#64748b" }}>Amount Paid</span>
                <span style={{ fontWeight: "600", color: "#22c55e" }}>
                  {fmt(invoice.amountPaid, tenant.currencySymbol)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ color: "#64748b" }}>Balance Due</span>
                <span style={{ fontWeight: "700", color: "#ef4444" }}>
                  {fmt(invoice.amountDue, tenant.currencySymbol)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bank Details */}
      {tenant.bankDetails && tenant.bankDetails.length > 0 && (
        <div style={{
          backgroundColor: "#f0f9ff", border: "1px solid #bae6fd",
          borderRadius: "8px", padding: "16px", marginBottom: "24px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Payment Details
          </div>
          {tenant.bankDetails.filter(b => b).map((bank, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#334155" }}>
              <span style={{ fontWeight: "600" }}>{bank.bankName}</span>
              {" • "}{bank.accountName}
              {" • "}<span style={{ fontWeight: "600" }}>{bank.accountNumber}</span>
              {bank.branchName && ` • ${bank.branchName}`}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            Notes
          </div>
          <div style={{ color: "#475569", fontSize: "12px" }}>{invoice.notes}</div>
        </div>
      )}

      {/* Terms */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
          Terms & Conditions
        </div>
        <div style={{ color: "#475569", fontSize: "12px" }}>
          {invoice.terms || tenant.termsAndConditions || "Payment is due within the agreed payment terms. Late payments may attract interest charges."}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "2px solid #e2e8f0", paddingTop: "16px", marginTop: "32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
          Thank you for your business!
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
          {tenant.companyName} • {invoice.invoiceNumber}
        </div>
      </div>
    </div>
  );
}