// KRA eTIMS client — scaffolded.
// NOTE: KRA's exact API schema depends on OSCU vs VSCU and your onboarding.
// This module provides a clean interface you fill in once you have sandbox creds.

export type EtimsConfig = {
  environment: "sandbox" | "production";
  device_type: "OSCU" | "VSCU";
  endpoint_url: string | null;
  device_serial: string | null;
  kra_pin: string | null;
  branch_id: string | null;
  api_key: string | null;
};

export type EtimsInvoicePayload = {
  document_type: "invoice" | "credit_note" | "debit_note" | "receipt";
  document_number: string;
  issue_date: string;          // YYYY-MM-DD
  customer_pin?: string | null;
  customer_name?: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;         // % (e.g. 16)
    vat_amount: number;
    line_total: number;
    hs_code?: string | null;
    item_code?: string | null;
  }>;
};

export type EtimsResponse = {
  ok: boolean;
  kra_invoice_no?: string;
  kra_signature?: string;
  kra_internal_data?: string;
  kra_qr_code?: string;
  kra_timestamp?: string;
  error_code?: string;
  error_message?: string;
  raw?: any;
};

/**
 * Submit a document to KRA eTIMS.
 *
 * Implementation note:
 * For OSCU (online), call KRA's virtual sandbox endpoint: https://etims-api-sbx.kra.go.ke
 * For VSCU, calls go through a local middleware.
 *
 * Below is the structured payload — adjust field names to match your onboarding doc.
 */
export async function submitToEtims(
  config: EtimsConfig,
  payload: EtimsInvoicePayload
): Promise<EtimsResponse> {
  if (!config.endpoint_url || !config.device_serial || !config.kra_pin) {
    return {
      ok: false,
      error_code: "CONFIG_MISSING",
      error_message: "eTIMS not configured. Add device serial, KRA PIN, and endpoint URL.",
    };
  }

  // Map to KRA payload shape (adapt per your device's API docs)
  const kraPayload = {
    tin: config.kra_pin,
    bhfId: config.branch_id ?? "00",
    dvcSrlNo: config.device_serial,
    invcNo: payload.document_number,
    rcptTyCd: payload.document_type === "credit_note" ? "R" : "S",
    pmtTyCd: "01",
    salesSttsCd: "02",
    cfmDt: payload.issue_date,
    salesDt: payload.issue_date.replace(/-/g, ""),
    prcOrdCd: null,
    clsDt: null,
    totItemCnt: payload.items.length,
    taxblAmtA: 0,
    taxblAmtB: payload.subtotal,
    taxblAmtC: 0,
    taxblAmtD: 0,
    taxRtA: 0,
    taxRtB: 16,
    taxRtC: 0,
    taxRtD: 0,
    taxAmtA: 0,
    taxAmtB: payload.vat_amount,
    taxAmtC: 0,
    taxAmtD: 0,
    totTaxblAmt: payload.subtotal,
    totTaxAmt: payload.vat_amount,
    totAmt: payload.total_amount,
    prchrAcptcYn: "N",
    remark: null,
    regrId: "erp",
    regrNm: "erp",
    modrId: "erp",
    modrNm: "erp",
    receipt: {
      custTin: payload.customer_pin ?? null,
      custMblNo: null,
      rptNo: 1,
      trdeNm: payload.customer_name ?? null,
      adrs: null,
      topMsg: "Karibu",
      btmMsg: "Asante Sana",
      prchrAcptcYn: "N",
    },
    itemList: payload.items.map((it, idx) => ({
      itemSeq: idx + 1,
      itemCd: it.item_code ?? `IT${String(idx + 1).padStart(4, "0")}`,
      itemClsCd: it.hs_code ?? "99999999",
      itemNm: it.description,
      bcd: null,
      pkgUnitCd: "NT",
      pkg: 1,
      qtyUnitCd: "U",
      qty: it.quantity,
      prc: it.unit_price,
      splyAmt: it.line_total - it.vat_amount,
      dcRt: 0,
      dcAmt: 0,
      taxTyCd: "B",
      taxblAmt: it.line_total - it.vat_amount,
      taxAmt: it.vat_amount,
      totAmt: it.line_total,
    })),
  };

  try {
    const res = await fetch(`${config.endpoint_url}/selectTrnsSalesList`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.api_key ? { "Authorization": `Bearer ${config.api_key}` } : {}),
      },
      body: JSON.stringify(kraPayload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.resultCd !== "000") {
      return {
        ok: false,
        error_code: json.resultCd ?? String(res.status),
        error_message: json.resultMsg ?? "Submission failed",
        raw: json,
      };
    }

    const data = json.data ?? {};
    return {
      ok: true,
      kra_invoice_no: data.curInvcNo ?? data.invcNo,
      kra_signature: data.rcptSign ?? data.intrlData,
      kra_internal_data: data.intrlData,
      kra_qr_code: data.qrCodeUrl,
      kra_timestamp: data.sdcDtTm ?? new Date().toISOString(),
      raw: json,
    };
  } catch (e: any) {
    return {
      ok: false,
      error_code: "NETWORK_ERROR",
      error_message: e.message ?? String(e),
    };
  }
}
