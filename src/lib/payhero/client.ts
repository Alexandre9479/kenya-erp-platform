/**
 * PayHero API helper.
 * Docs: https://docs.payhero.co.ke
 *
 * Auth: Basic header base64(api_username:api_password)
 * Endpoints: POST /payments   (STK push / collect)
 *            POST /payouts    (B2C pay-out)
 */

const PAYHERO_BASE = process.env.PAYHERO_BASE_URL ?? "https://backend.payhero.co.ke/api/v2";

type Creds = { api_username: string; api_password: string };

export function basicAuthHeader({ api_username, api_password }: Creds) {
  const token = Buffer.from(`${api_username}:${api_password}`).toString("base64");
  return `Basic ${token}`;
}

export type StkPushInput = {
  amount: number;
  phone: string;              // 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX
  channel_id: string;
  external_reference: string;
  provider?: "m-pesa" | "airtel";
  callback_url?: string;
  customer_name?: string;
};

export function normalisePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0"))   return "254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits;
  return digits;
}

export async function initiateStkPush(creds: Creds, input: StkPushInput) {
  const res = await fetch(`${PAYHERO_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(creds),
    },
    body: JSON.stringify({
      amount: input.amount,
      phone_number: normalisePhone(input.phone),
      channel_id: input.channel_id,
      provider: input.provider ?? "m-pesa",
      external_reference: input.external_reference,
      callback_url: input.callback_url,
      customer_name: input.customer_name,
    }),
  });

  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new Error(json?.message ?? json?.error ?? `PayHero ${res.status}`);
  }
  return json;
}

export async function initiatePayout(creds: Creds, input: {
  amount: number;
  phone: string;
  channel_id: string;
  external_reference: string;
  remarks?: string;
}) {
  const res = await fetch(`${PAYHERO_BASE}/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(creds),
    },
    body: JSON.stringify({
      amount: input.amount,
      phone_number: normalisePhone(input.phone),
      channel_id: input.channel_id,
      external_reference: input.external_reference,
      remarks: input.remarks,
    }),
  });

  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) throw new Error(json?.message ?? json?.error ?? `PayHero ${res.status}`);
  return json;
}
