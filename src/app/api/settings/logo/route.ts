import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "tenant_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });

  const supabase = await createServiceClient();
  const tenantId = session.user.tenantId;
  const ext = file.name.split(".").pop() ?? "png";
  const path = `logos/${tenantId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("erp-uploads")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from("erp-uploads").getPublicUrl(path);
  const logo_url = `${publicUrl}?v=${Date.now()}`;

  await supabase.from("tenants").update({ logo_url }).eq("id", tenantId);
  return NextResponse.json({ logo_url });
}
