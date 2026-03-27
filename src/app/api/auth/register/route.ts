import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/drizzle";
import { tenants, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

const registerSchema = z.object({
  // Company details
  companyName: z.string().min(2),
  companyEmail: z.string().email(),
  companyPhone: z.string().min(10),
  companyAddress: z.string().min(5),
  companyCity: z.string().optional(),
  companyCountry: z.string().default("Kenya"),
  kraPin: z.string().optional(),
  currency: z.string().default("KES"),
  currencySymbol: z.string().default("KSh"),
  // Admin user details
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  adminEmail: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Check if company email exists
    const existingTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.companyEmail, data.companyEmail))
      .limit(1);

    if (existingTenant.length > 0) {
      return NextResponse.json(
        { success: false, error: "A company with this email already exists" },
        { status: 400 }
      );
    }

    // Check if admin email exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Create tenant
    const tenantId = createId();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    await db.insert(tenants).values({
      id: tenantId,
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      companyPhone: data.companyPhone,
      companyAddress: data.companyAddress,
      companyCity: data.companyCity,
      companyCountry: data.companyCountry,
      kraPin: data.kraPin,
      currency: data.currency,
      currencySymbol: data.currencySymbol,
      subscription: "trial",
      trialEndsAt,
      isActive: true,
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash(data.password, 12);

    await db.insert(users).values({
      id: createId(),
      tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.adminEmail,
      password: hashedPassword,
      role: "tenant_admin",
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "Company registered successfully! You can now log in.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}