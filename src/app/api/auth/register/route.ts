import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";

const registerSchema = z.object({
  company_name: z.string().min(2),
  company_email: z.email(),
  company_phone: z.string().min(9),
  admin_name: z.string().min(2),
  admin_email: z.email(),
  password: z.string().min(8),
  country: z.string().default("Kenya"),
  kra_pin: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const supabase = await createServiceClient();

    // Check if admin email is already registered
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", data.admin_email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (12 rounds minimum)
    const password_hash = await bcrypt.hash(data.password, 12);

    // Call register_company Supabase RPC function
    // This atomically creates: tenant + admin user + chart of accounts + warehouse + sequences
    const { data: result, error } = await supabase.rpc("register_company", {
      p_company_name: data.company_name.trim(),
      p_company_email: data.company_email.toLowerCase().trim(),
      p_company_phone: data.company_phone.trim(),
      p_admin_name: data.admin_name.trim(),
      p_admin_email: data.admin_email.toLowerCase().trim(),
      p_password_hash: password_hash,
      p_country: data.country,
      p_kra_pin: data.kra_pin ?? null,
    });

    if (error) {
      console.error("[register_company rpc]", error);
      return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Account created successfully.", data: result },
      { status: 201 }
    );
  } catch (err) {
    // Zod validation error
    if (err && typeof err === "object" && "issues" in err) {
      const issues = (err as { issues: Array<{ message: string }> }).issues;
      return NextResponse.json(
        { error: issues[0]?.message ?? "Validation failed." },
        { status: 400 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
