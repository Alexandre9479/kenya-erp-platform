import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/drizzle";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { logoUrl } = body;

    if (!logoUrl) {
      return NextResponse.json({ success: false, error: "Logo URL is required" }, { status: 400 });
    }

    await db
      .update(tenants)
      .set({ companyLogo: logoUrl, updatedAt: new Date() })
      .where(eq(tenants.id, session.user.tenantId));

    return NextResponse.json({ success: true, message: "Logo updated successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update logo" }, { status: 500 });
  }
}