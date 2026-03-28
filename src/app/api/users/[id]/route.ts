import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum([
    "tenant_admin", "accountant", "sales",
    "purchasing", "warehouse", "hr", "viewer"
  ]).optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["super_admin", "tenant_admin"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    // Hash password if provided
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }
    delete updateData.password;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const updated = await db
      .update(users)
      .set(updateData)
      .where(
        and(
          eq(users.id, id),
          eq(users.tenantId, session.user.tenantId)
        )
      )
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        department: users.department,
        phone: users.phone,
        isActive: users.isActive,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      });

    if (!updated.length) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["super_admin", "tenant_admin"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(users.id, id),
          eq(users.tenantId, session.user.tenantId)
        )
      );

    return NextResponse.json({ success: true, message: "User deactivated" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to deactivate user" },
      { status: 500 }
    );
  }
}