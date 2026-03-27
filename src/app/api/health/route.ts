import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`SELECT version()`;
    return NextResponse.json({
      success: true,
      message: "✅ ERP Platform API is running",
      database: "Connected to Neon PostgreSQL",
      version: result[0].version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "❌ Database connection failed",
        error: String(error),
      },
      { status: 500 }
    );
  }
}