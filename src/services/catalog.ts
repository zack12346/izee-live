import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category, Product, ProductImage, PublicProduct, Review } from "@/types";

const PUBLIC_PRODUCT_COLUMNS = "id, name, slug, description, short_description, price, compare_price, category_id, file_name, file_type, file_size, version, tags, subscription_type, account_type, duration_value, duration_unit, featured, published, sales_count, rating_avg, rating_count, created_at, updated_at";

function toPublic(product: Product): PublicProduct {
  const { file_path: _hidden, ...rest } = product;
  void _hidden;
  return rest;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) return [];
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  return (data as Category | null) ?? null;
}

export async function getProductImages(productIds: string[]) {
  if (productIds.length === 0) return [] as ProductImage[];
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_images")
    .select("*")
    .in("product_id", productIds)
    .order("sort_order");
  return (data ?? []) as ProductImage[];
}

export async function attachImages(products: Product[]): Promise<PublicProduct[]> {
  const images = await getProductImages(products.map((item) => item.id));
  let available = new Set<string>();
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("digital_inventory").select("product_id").in("product_id", products.map((item) => item.id)).eq("status", "available");
    available = new Set((data ?? []).map((item) => item.product_id));
  } catch {
    // The inventory migration may not be applied yet; keep the catalog usable.
  }
  return products.map((product) => ({
    ...toPublic(product),
    images: images.filter((image) => image.product_id === product.id),
    available_inventory: available.has(product.id),
  }));
}

export type ProductFilters = {
  categoryId?: string;
  query?: string;
  featured?: boolean;
  onSale?: boolean;
  sort?: "new" | "price-asc" | "price-desc" | "best";
  page?: number;
  pageSize?: number;
};

export async function getProducts(filters: ProductFilters = {}) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("products").select(`${PUBLIC_PRODUCT_COLUMNS}, category:categories(*)`, { count: "exact" }).eq("published", true);

  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.featured) query = query.eq("featured", true);
  if (filters.onSale) query = query.not("compare_price", "is", null).gt("compare_price", 0);
  if (filters.query) {
    // Keep user input from changing the PostgREST filter expression.
    const q = filters.query.replace(/[,%(){}]/g, " ").trim();
    if (!q) return { products: [] as PublicProduct[], total: 0 };
    query = query.or(`name.ilike.%${q}%,short_description.ilike.%${q}%,tags.cs.{${q}}`);
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "best":
      query = query.order("sales_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) {
    return { products: [] as PublicProduct[], total: 0 };
  }

  const products = await attachImages((data ?? []) as unknown as Product[]);
  const withCats = products.map((product, index) => ({
    ...product,
    category: (() => {
      const category = ((data ?? [])[index] as unknown as { category?: Category | Category[] | null })?.category;
      return Array.isArray(category) ? category[0] ?? null : category ?? null;
    })(),
  }));

  return { products: withCats, total: count ?? 0 };
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(`${PUBLIC_PRODUCT_COLUMNS}, category:categories(*)`)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!data) return null;
  const [product] = await attachImages([data as unknown as Product]);
  const category = (data as unknown as { category?: Category | Category[] | null }).category;
  return { ...product, category: Array.isArray(category) ? category[0] ?? null : category ?? null };
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [] as PublicProduct[];
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PUBLIC_PRODUCT_COLUMNS).in("id", ids).eq("published", true);
  return attachImages((data ?? []) as unknown as Product[]);
}

export async function getHomeCollections() {
  const [featured, newest, best, sale, reviews] = await Promise.all([
    getProducts({ featured: true, pageSize: 8, sort: "best" }),
    getProducts({ pageSize: 8, sort: "new" }),
    getProducts({ pageSize: 8, sort: "best" }),
    getProducts({ onSale: true, pageSize: 8, sort: "best" }),
    getApprovedReviews(8),
  ]);
  return { featured, newest, best, sale, reviews };
}

export async function getApprovedReviews(limit = 8): Promise<Review[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, profile:profiles(full_name, avatar_url)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Review[];
}

export async function getProductReviews(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, profile:profiles(full_name, avatar_url)")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  return (data ?? []) as Review[];
}

export async function getRelatedProducts(product: PublicProduct) {
  const supabase = await createClient();
  let query = supabase.from("products").select(PUBLIC_PRODUCT_COLUMNS).eq("published", true).neq("id", product.id).limit(4);
  if (product.category_id) query = query.eq("category_id", product.category_id);
  const { data } = await query;
  return attachImages((data ?? []) as unknown as Product[]);
}
