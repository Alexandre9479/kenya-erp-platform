import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const bankDetailSchema = z.object({
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  branchName: z.string().optional(),
  swiftCode: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyEmail: z.string().email("Valid email required"),
  companyPhone: z.string().min(1, "Phone is required"),
  companyAddress: z.string().min(1, "Address is required"),
  companyCity: z.string().optional(),
  companyCountry: z.string().default("Kenya"),
  companyLogo: z.string().optional(),
  kraPin: z.string().optional(),
  vatNumber: z.string().optional(),
  currency: z.string().default("KES"),
  currencySymbol: z.string().default("KSh"),
  timezone: z.string().default("Africa/Nairobi"),
  fiscalYearStart: z.string().default("01-01"),
  paymentTerms: z.string().optional(),
  termsAndConditions: z.string().optional(),
  bankDetails: z.array(bankDetailSchema).default([]),
  invoicePrefix: z.string().default("INV"),
  quotePrefix: z.string().default("QTE"),
  lpoPrefix: z.string().default("LPO"),
  grnPrefix: z.string().default("GRN"),
  dnPrefix: z.string().default("DN"),
  receiptPrefix: z.string().default("RCP"),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, session.user.tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tenant });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = settingsSchema.parse(body);

    const updated = await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, session.user.tenantId))
      .returning();

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Settings PUT error:", error);
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
  }
}