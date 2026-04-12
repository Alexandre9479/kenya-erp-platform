import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/supabase";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  role: z.enum([
    "super_admin",
    "tenant_admin",
    "accountant",
    "sales",
    "purchasing",
    "warehouse",
    "hr",
    "viewer",
  ]),
  phone: z.string().optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// ─── GET /api/users ───────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "No tenant associated with this account" }, { status: 400 });
    }
    if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)));
    const offset = (page - 1) * limit;

    const supabase = await createServiceClient();

    let query = supabase
      .from("users")
      .select(
        "id, tenant_id, email, full_name, role, is_active, phone, avatar_url, last_login_at, created_at, updated_at",
        { count: "exact" }
      )
      .eq("tenant_id", session.user.tenantId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq("role", role as UserRole);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[users GET]", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], count: count ?? 0 });
  } catch (err) {
    console.error("[users GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/users ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "No tenant associated with this account" }, { status: 400 });
    }
    if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 }
      );
    }

    const { full_name, email, role, phone, password } = parsed.data;

    const supabase = await createServiceClient();

    // Check email uniqueness
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from("users")
      .insert({
        tenant_id: session.user.tenantId,
        email: email.toLowerCase().trim(),
        full_name: full_name.trim(),
        role,
        phone: phone ?? null,
        password_hash,
        is_active: true,
        avatar_url: null,
        last_login_at: null,
      })
      .select(
        "id, tenant_id, email, full_name, role, is_active, phone, avatar_url, last_login_at, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("[users POST]", error);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[users POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
