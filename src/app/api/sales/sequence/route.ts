import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { invoices, quotes, deliveryNotes, receipts, lpos } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "invoice";
    const tenantId = session.user.tenantId;

    let nextNumber = 1;

    if (type === "invoice") {
      const [result] = await db.select({ count: count() }).from(invoices).where(eq(invoices.tenantId, tenantId));
      nextNumber = result.count + 1;
    } else if (type === "quote") {
      const [result] = await db.select({ count: count() }).from(quotes).where(eq(quotes.tenantId, tenantId));
      nextNumber = result.count + 1;
    } else if (type === "delivery_note") {
      const [result] = await db.select({ count: count() }).from(deliveryNotes).where(eq(deliveryNotes.tenantId, tenantId));
      nextNumber = result.count + 1;
    } else if (type === "receipt") {
      const [result] = await db.select({ count: count() }).from(receipts).where(eq(receipts.tenantId, tenantId));
      nextNumber = result.count + 1;
    }else if (type === "lpo") {
      const [result] = await db.select({ count: count() }).from(lpos).where(eq(lpos.tenantId, tenantId));
      nextNumber = result.count + 1;
    }

    const prefixMap: Record<string, string> = {
      invoice: "INV",
      quote: "QTE",
      delivery_note: "DN",
      receipt: "RCP",
      lpo: "LPO",
    };

    const prefix = prefixMap[type] || "DOC";
    const number = `${prefix}-${String(nextNumber).padStart(5, "0")}`;

    return NextResponse.json({ success: true, data: { number, sequence: nextNumber } });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to get sequence" }, { status: 500 });
  }
}