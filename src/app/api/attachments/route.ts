import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const BUCKET = "attachments";

const listSchema = z.object({
  doc_type: z.string(),
  doc_id: z.string().uuid(),
});

// GET /api/attachments?doc_type=invoice&doc_id=<uuid>
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = listSchema.safeParse({
    doc_type: searchParams.get("doc_type"),
    doc_id: searchParams.get("doc_id"),
  });
  if (!parsed.success) return NextResponse.json({ error: "doc_type and doc_id required" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data, error } = await db
    .from("attachments")
    .select("*")
    .eq("tenant_id", session.user.tenantId)
    .eq("doc_type", parsed.data.doc_type)
    .eq("doc_id", parsed.data.doc_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sign URLs for each attachment (valid for 1 hour)
  const withUrls = await Promise.all(
    (data ?? []).map(async (a: any) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(a.storage_path, 3600);
      return { ...a, download_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ data: withUrls });
}

// POST multipart/form-data: file, doc_type, doc_id, label?
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const doc_type = form.get("doc_type") as string | null;
  const doc_id = form.get("doc_id") as string | null;
  const label = (form.get("label") as string | null) ?? null;

  if (!file || !doc_type || !doc_id) {
    return NextResponse.json({ error: "file, doc_type, doc_id required" }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Max file size is 25 MB" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const supabase = await createServiceClient();
  const db = supabase as any;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${tenantId}/${doc_type}/${doc_id}/${randomUUID()}-${safeName}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data, error } = await db
    .from("attachments")
    .insert({
      tenant_id: tenantId,
      doc_type,
      doc_id,
      filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      label,
      uploaded_by: session.user.id,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/attachments?id=<uuid>
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createServiceClient();
  const db = supabase as any;

  const { data: att } = await db
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .single();

  if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([att.storage_path]);
  const { error } = await db.from("attachments").delete().eq("id", id).eq("tenant_id", session.user.tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
