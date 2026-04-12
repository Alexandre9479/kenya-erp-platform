import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { InventoryClient } from "@/components/inventory/inventory-client";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Super admins don't belong to a tenant
  if (session.user.role !== "super_admin" && !session.user.tenantId) {
    redirect("/login");
  }

  const tenantId = session.user.tenantId!;

  const supabase = await createServiceClient();

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories(name), stock_levels(quantity)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(0, 24),
    supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true }),
  ]);

  type RawProduct = {
    id: string;
    tenant_id: string;
    category_id: string | null;
    sku: string;
    name: string;
    description: string | null;
    unit: string;
    cost_price: number;
    selling_price: number;
    vat_rate: number;
    reorder_level: number;
    is_active: boolean;
    image_url: string | null;
    barcode: string | null;
    created_at: string;
    updated_at: string;
    categories: { name: string } | null;
    stock_levels: { quantity: number }[];
  };

  type ProductRow = {
    id: string;
    tenant_id: string;
    category_id: string | null;
    sku: string;
    name: string;
    description: string | null;
    unit: string;
    cost_price: number;
    selling_price: number;
    vat_rate: number;
    reorder_level: number;
    is_active: boolean;
    image_url: string | null;
    barcode: string | null;
    created_at: string;
    updated_at: string;
    category_name: string | null;
    total_stock: number;
  };

  type CategoryRow = {
    id: string;
    tenant_id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    created_at: string;
  };

  const rawProducts = (productsResult.data ?? []) as unknown as RawProduct[];
  const initialProducts: ProductRow[] = rawProducts.map((p) => {
    const category_name = p.categories?.name ?? null;
    const total_stock = Array.isArray(p.stock_levels)
      ? p.stock_levels.reduce((sum, sl) => sum + sl.quantity, 0)
      : 0;
    return {
      id: p.id,
      tenant_id: p.tenant_id,
      category_id: p.category_id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      unit: p.unit,
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      vat_rate: p.vat_rate,
      reorder_level: p.reorder_level,
      is_active: p.is_active,
      image_url: p.image_url,
      barcode: p.barcode,
      created_at: p.created_at,
      updated_at: p.updated_at,
      category_name,
      total_stock,
    };
  });

  // Fetch total count separately
  const { count: totalCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const initialCategories = (categoriesResult.data ?? []) as CategoryRow[];

  return (
    <InventoryClient
      initialProducts={initialProducts}
      initialCategories={initialCategories}
      totalCount={totalCount ?? 0}
    />
  );
}
