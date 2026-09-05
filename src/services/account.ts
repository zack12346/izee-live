"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { newsletterSchema, profileSchema, reviewSchema } from "@/lib/validations";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/account/profile");
  return { ok: true as const };
}

export async function toggleFavoriteAction(productId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
    revalidatePath("/account/favorites");
    return { ok: true as const, favorited: false };
  }

  const { error } = await supabase.from("favorites").insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false as const, error: error.message, favorited: false };
  revalidatePath("/account/favorites");
  return { ok: true as const, favorited: true };
}

export async function submitReviewAction(formData: FormData) {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("downloads")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", parsed.data.productId)
    .maybeSingle();
  if (!owned) {
    return { ok: false as const, error: "يمكنك التقييم فقط بعد شراء المنتج." };
  }

  const { error } = await supabase.from("reviews").upsert(
    {
      user_id: user.id,
      product_id: parsed.data.productId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      status: "pending",
    },
    { onConflict: "user_id,product_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/account/reviews");
  return { ok: true as const };
}

export async function subscribeNewsletterAction(formData: FormData) {
  const parsed = newsletterSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "بريد غير صالح" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({ email: parsed.data.email });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return { ok: false as const, error: "تعذر الاشتراك حالياً." };
  }
  return { ok: true as const };
}

export async function requestDownloadUrl(productId: string) {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: entitlement } = await admin
    .from("downloads")
    .select("id, download_count")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  if (!entitlement) {
    return { ok: false as const, error: "لا تملك صلاحية تحميل هذا المنتج." };
  }

  const { data: product } = await admin
    .from("products")
    .select("file_path, file_name")
    .eq("id", productId)
    .single();

  if (!product?.file_path) {
    return { ok: false as const, error: "ملف المنتج غير مرفوع بعد. تواصل مع الدعم." };
  }

  const { data: signed, error } = await admin.storage
    .from("product-files")
    .createSignedUrl(product.file_path, 60, { download: product.file_name ?? true });

  if (error || !signed?.signedUrl) {
    return { ok: false as const, error: "تعذر إنشاء رابط التحميل." };
  }

  await admin
    .from("downloads")
    .update({
      download_count: Number(entitlement.download_count ?? 0) + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq("id", entitlement.id);

  return { ok: true as const, url: signed.signedUrl };
}

export async function getMyOrders() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, items:order_items(*), payments(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyOrder(orderId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, items:order_items(*), payments(*)")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}

export async function getMyDownloads() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("downloads")
    .select("*, product:products(id, name, slug, file_name, file_type, version, file_size)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyFavorites() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("favorites")
    .select("*, product:products(id, name, slug, description, short_description, price, compare_price, category_id, file_name, file_type, file_size, version, tags, featured, published, sales_count, rating_avg, rating_count, created_at, updated_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyReviews() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, product:products(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMyDigitalDeliveries() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("digital_inventory")
    .select("id, product_id, email, password, profile_name, pin, activation_code, activation_link, instructions, delivered_at, product:products(name, slug)")
    .eq("delivered_to", user.id)
    .eq("status", "delivered")
    .order("delivered_at", { ascending: false });
  return data ?? [];
}

export async function isFavorited(productId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();
  return Boolean(data);
}

export async function hasPurchased(productId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("downloads")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();
  return Boolean(data);
}
