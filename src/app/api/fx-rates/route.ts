import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  base_currency: z.string().length(3),
  quote_currency: z.string().length(3),
  rate_date: z.string(),
  rate: z.number().positive(),
  source: z.string().optional().default("manual"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const base = searchParams.get("base");
  const quote = searchParams.get("quote");

  const supabase = await createServiceClient();
  const db = supabase as any;

  let q = db
    .from("fx_rates")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .order("rate_date", { ascending: false })
    .limit(200);

  if (base) q = q.eq("base_currency", base);
  if (quote) q = q.eq("quote_currency", quote);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin" && session.user.role !== "accountant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("fx_rates")
    .upsert(
      { ...parsed.data, tenant_id: session.user.tenantId },
      { onConflict: "tenant_id,base_currency,quote_currency,rate_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
