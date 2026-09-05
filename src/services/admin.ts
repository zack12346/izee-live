"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { categorySchema, couponSchema, paymentSettingsSchema, productSchema, settingsSchema } from "@/lib/validations";
import { STORAGE_FILES_BUCKET, STORAGE_IMAGES_BUCKET } from "@/lib/constants";
import { slugify } from "@/lib/format";

const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PRODUCT_FILE_SIZE = 100 * 1024 * 1024;

function storageFileName(name: string, fallback: string) {
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return safeName || fallback;
}

function revalidateStore() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
}

export async function getAdminProducts() {
  await requireAdmin();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("products")
      .select("*, category:categories(id, name), images:product_images(id, url, alt, sort_order)")
      .order("created_at", { ascending: false });

    if (!error) return data ?? [];

    // Keep the admin page usable if a relation is missing or its schema is stale.
    const fallback = await admin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (fallback.error) return [];
    return fallback.data ?? [];
  } catch {
    // A missing server key, unavailable database, or unexpected query error
    // should render an empty management list instead of the generic error page.
    return [];
  }
}

export async function saveProductAction(formData: FormData, productId?: string) {
  await requireAdmin();
  const uploadedFile = formData.get("file") as File | null;
  const description = String(formData.get("description") ?? "").trim();
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || slugify(String(formData.get("name") ?? "")),
    description,
    short_description: formData.get("short_description") || description.slice(0, 280),
    price: formData.get("price"),
    compare_price: formData.get("compare_price") || null,
    category_id: formData.get("category_id") || null,
    file_type: formData.get("file_type") || uploadedFile?.type?.split("/").pop() || "other",
    version: formData.get("version") || "1.0",
    tags: formData.get("tags") ?? "",
    subscription_type: formData.get("subscription_type") || "none",
    delivery_payload: formData.get("delivery_payload") || null,
    account_type: formData.get("account_type") || "shared_profile",
    duration_value: formData.get("duration_value") || null,
    duration_unit: formData.get("duration_unit") || null,
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "تحقق من الحقول" };
  }

  const admin = createAdminClient();
  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    short_description: parsed.data.short_description,
    price: parsed.data.price,
    compare_price: parsed.data.compare_price || null,
    category_id: parsed.data.category_id || null,
    file_type: parsed.data.file_type,
    version: parsed.data.version,
    tags: parsed.data.tags
      ? parsed.data.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [],
    subscription_type: parsed.data.subscription_type,
    delivery_payload: parsed.data.delivery_payload || null,
    account_type: parsed.data.account_type,
    duration_value: parsed.data.duration_value ? Number(parsed.data.duration_value) : null,
    duration_unit: parsed.data.duration_unit || null,
    featured: parsed.data.featured ?? false,
    published: parsed.data.published ?? false,
  };

  let id = productId;
  if (id) {
    const { error } = await admin.from("products").update(payload).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { data, error } = await admin.from("products").insert(payload).select("id").single();
    if (error || !data) return { ok: false as const, error: error?.message ?? "تعذر إنشاء المنتج" };
    id = data.id;
  }

  const image = formData.get("image") as File | null;
  if (image && image.size > 0) {
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(image.type)) {
      return { ok: false as const, error: "ملف الصورة غير صالح." };
    }
    if (image.size > MAX_PRODUCT_IMAGE_SIZE) {
      return { ok: false as const, error: "حجم الصورة يتجاوز 5 ميغابايت." };
    }
    const path = `${id}/${Date.now()}-${storageFileName(image.name, "product-image")}`;
    const { error: uploadError } = await admin.storage.from(STORAGE_IMAGES_BUCKET).upload(path, image, {
      upsert: true,
    });
    if (!uploadError) {
      const { data } = admin.storage.from(STORAGE_IMAGES_BUCKET).getPublicUrl(path);
      await admin.from("product_images").insert({
        product_id: id,
        url: data.publicUrl,
        alt: parsed.data.name,
        sort_order: 0,
      });
    }
  }

  const file = uploadedFile;
  if (file && file.size > 0) {
    if (file.size > MAX_PRODUCT_FILE_SIZE) {
      return { ok: false as const, error: "حجم ملف المنتج يتجاوز 100 ميغابايت.", id };
    }
    const path = `${id}/${storageFileName(file.name, "product-file")}`;
    const { error: uploadError } = await admin.storage.from(STORAGE_FILES_BUCKET).upload(path, file, {
      upsert: true,
    });
    if (uploadError) return { ok: false as const, error: uploadError.message, id };
    await admin
      .from("products")
      .update({
        file_path: path,
        file_name: file.name,
        file_size: file.size,
      })
      .eq("id", id);
  }

  const inventory = {
    email: String(formData.get("inventory_email") ?? "").trim() || null,
    password: String(formData.get("inventory_password") ?? "") || null,
    profile_name: String(formData.get("inventory_profile_name") ?? "").trim() || null,
    pin: String(formData.get("inventory_pin") ?? "") || null,
    activation_code: String(formData.get("activation_code") ?? "").trim() || null,
    activation_link: String(formData.get("activation_link") ?? "").trim() || null,
    instructions: String(formData.get("inventory_instructions") ?? "").trim() || null,
  };
  if (id && Object.values(inventory).some(Boolean)) {
    await admin.from("digital_inventory").insert({ product_id: id, ...inventory, status: "available" });
  }

  revalidateStore();
  revalidatePath(`/admin/products/${id}`);
  return { ok: true as const, id };
}

export async function deleteProductAction(productId: string) {
  await requireAdmin();
  const parsedId = z.string().uuid().safeParse(productId);
  if (!parsedId.success) return { ok: false as const, error: "معرّف المنتج غير صالح." };
  const admin = createAdminClient();
  const { error } = await admin.from("products").delete().eq("id", productId);
  if (error) return { ok: false as const, error: error.message };
  revalidateStore();
  return { ok: true as const };
}

export async function togglePublishAction(productId: string, published: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("products").update({ published }).eq("id", productId);
  if (error) return { ok: false as const, error: error.message };
  revalidateStore();
  return { ok: true as const };
}

export async function saveCategoryAction(formData: FormData, categoryId?: string) {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || slugify(String(formData.get("name") ?? "")),
    description: formData.get("description") ?? "",
    sort_order: formData.get("sort_order") ?? 0,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "تحقق من الحقول" };
  }
  const admin = createAdminClient();
  if (categoryId) {
    const { error } = await admin.from("categories").update(parsed.data).eq("id", categoryId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await admin.from("categories").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidateStore();
  revalidatePath("/admin/categories");
  return { ok: true as const };
}

export async function deleteCategoryAction(categoryId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("categories").delete().eq("id", categoryId);
  if (error) return { ok: false as const, error: error.message };
  revalidateStore();
  return { ok: true as const };
}

export async function saveCouponAction(formData: FormData, couponId?: string) {
  await requireAdmin();
  const parsed = couponSchema.safeParse({
    code: String(formData.get("code") ?? "").toUpperCase(),
    type: formData.get("type"),
    value: formData.get("value"),
    starts_at: formData.get("starts_at") || null,
    expires_at: formData.get("expires_at") || null,
    usage_limit: formData.get("usage_limit") || null,
    min_order: formData.get("min_order") || 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "تحقق من الحقول" };
  }
  const admin = createAdminClient();
  const payload = {
    ...parsed.data,
    starts_at: parsed.data.starts_at ? new Date(parsed.data.starts_at).toISOString() : null,
    expires_at: parsed.data.expires_at ? new Date(parsed.data.expires_at).toISOString() : null,
  };
  if (couponId) {
    const { error } = await admin.from("coupons").update(payload).eq("id", couponId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await admin.from("coupons").insert(payload);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/admin/coupons");
  return { ok: true as const };
}

export async function deleteCouponAction(couponId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("coupons").delete().eq("id", couponId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/coupons");
  return { ok: true as const };
}

export async function setReviewStatusAction(reviewId: string, status: "approved" | "rejected") {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: review, error } = await admin
    .from("reviews")
    .update({ status })
    .eq("id", reviewId)
    .select("product_id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  if (review?.product_id) {
    await admin.rpc("refresh_product_rating", { p_product_id: review.product_id });
  }
  revalidatePath("/admin/reviews");
  revalidateStore();
  return { ok: true as const };
}

export async function deleteReviewAction(reviewId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: review } = await admin.from("reviews").select("product_id").eq("id", reviewId).single();
  const { error } = await admin.from("reviews").delete().eq("id", reviewId);
  if (error) return { ok: false as const, error: error.message };
  if (review?.product_id) {
    await admin.rpc("refresh_product_rating", { p_product_id: review.product_id });
  }
  revalidatePath("/admin/reviews");
  return { ok: true as const };
}

export async function updateUserRoleAction(userId: string, role: "customer" | "admin") {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/customers");
  return { ok: true as const };
}

export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    store_name: formData.get("store_name"),
    currency: formData.get("currency"),
    support_email: formData.get("support_email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "تحقق من الحقول" };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("site_settings").upsert({
    key: "general",
    value: parsed.data,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true as const };
}

export async function savePaymentSettingsAction(formData: FormData) {
  await requireAdmin();
  const parsed = paymentSettingsSchema.safeParse({
    baridimob_number: String(formData.get("baridimob_number") ?? "").trim(),
    ccp_number: String(formData.get("ccp_number") ?? "").trim(),
    account_holder: String(formData.get("account_holder") ?? "").trim(),
    baridimob_instructions: String(formData.get("baridimob_instructions") ?? "").trim(),
    ccp_instructions: String(formData.get("ccp_instructions") ?? "").trim(),
    flexy_phone: String(formData.get("flexy_phone") ?? "").trim(),
    flexy_instructions: String(formData.get("flexy_instructions") ?? "").trim(),
    baridimob_enabled: formData.get("baridimob_enabled") === "on",
    ccp_enabled: formData.get("ccp_enabled") === "on",
    flexy_enabled: formData.get("flexy_enabled") === "on",
  });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "تحقق من إعدادات الدفع" };
  const admin = createAdminClient();
  const { error } = await admin.from("site_settings").upsert({ key: "payments", value: parsed.data, updated_at: new Date().toISOString() });
  if (error) return { ok: false as const, error: "تعذر حفظ إعدادات الدفع." };
  revalidatePath("/checkout");
  revalidatePath("/admin/settings/payments");
  return { ok: true as const };
}

export async function getAdminAnalytics() {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: orders }, { count: customers }, { count: products }] = await Promise.all([
    admin.from("orders").select("id, total, status, created_at").order("created_at", { ascending: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("products").select("*", { count: "exact", head: true }),
  ]);

  const paid = (orders ?? []).filter((order) => order.status === "paid");
  const revenue = paid.reduce((sum, order) => sum + Number(order.total), 0);
  const byDay = new Map<string, { revenue: number; sales: number }>();
  for (const order of paid) {
    const day = order.created_at.slice(0, 10);
    const current = byDay.get(day) ?? { revenue: 0, sales: 0 };
    current.revenue += Number(order.total);
    current.sales += 1;
    byDay.set(day, current);
  }

  const { data: best } = await admin
    .from("products")
    .select("id, name, sales_count, price")
    .order("sales_count", { ascending: false })
    .limit(6);

  const { data: recent } = await admin
    .from("orders")
    .select("id, total, status, created_at, user_id, profiles(email, full_name)")
    .order("created_at", { ascending: false })
    .limit(8);

  return {
    revenue,
    orders: orders?.length ?? 0,
    paidOrders: paid.length,
    customers: customers ?? 0,
    products: products ?? 0,
    chart: [...byDay.entries()].slice(-14).map(([date, value]) => ({ date, ...value })),
    bestSellers: best ?? [],
    recentOrders: recent ?? [],
  };
}

export async function getAdminOrderCount() {
  await requireAdmin();
  const admin = createAdminClient();
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getAdminOrders() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("id, order_number, user_id, status, payment_status, payment_method, total, created_at, profiles(email, full_name), items:order_items(id, product_id, name, quantity), payments(id, status, provider, reference, transaction_reference, receipt_path, amount, created_at)")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getAdminReceiptUrl(orderId: string) {
  await requireAdmin();
  const parsedId = z.string().uuid().safeParse(orderId);
  if (!parsedId.success) return null;
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("receipt_path").eq("order_id", orderId).maybeSingle();
  if (!payment?.receipt_path) return null;
  const { data, error } = await admin.storage.from("payment-receipts").createSignedUrl(payment.receipt_path, 300);
  return error ? null : data.signedUrl;
}

export async function reviewManualPayment(orderId: string, decision: "approve" | "reject") {
  await requireAdmin();
  const parsedInput = z.object({ orderId: z.string().uuid(), decision: z.enum(["approve", "reject"]) }).safeParse({ orderId, decision });
  if (!parsedInput.success) return { ok: false as const, error: "بيانات المراجعة غير صالحة." };
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id, user_id, status, payment_status").eq("id", orderId).maybeSingle();
  if (!order || order.payment_status !== "under_review") return { ok: false as const, error: "الطلب غير موجود أو تمت مراجعته مسبقًا." };

  if (decision === "reject") {
    await admin.from("payments").update({ status: "rejected" }).eq("order_id", orderId);
    await admin.from("orders").update({ status: "cancelled", payment_status: "rejected" }).eq("id", orderId);
    revalidatePath("/admin/orders");
    return { ok: true as const };
  }

  const { data: items } = await admin.from("order_items").select("product_id, name, quantity").eq("order_id", orderId);
  let deliveredAll = true;
  for (const item of items ?? []) {
    for (let index = 0; index < item.quantity; index += 1) {
      const { data: inventory } = await admin.from("digital_inventory").select("id").eq("product_id", item.product_id).eq("status", "available").limit(1).maybeSingle();
      if (!inventory) {
        deliveredAll = false;
        continue;
      }
      await admin.from("digital_inventory").update({ status: "delivered", order_id: orderId, delivered_to: order.user_id, delivered_at: new Date().toISOString() }).eq("id", inventory.id).eq("status", "available");
    }
  }
  await admin.from("payments").update({ status: "confirmed" }).eq("order_id", orderId);
  await admin.from("orders").update({ status: deliveredAll ? "completed" : "processing", payment_status: "confirmed" }).eq("id", orderId);
  await admin.from("notifications").insert({ user_id: order.user_id, title: deliveredAll ? "تم تأكيد الدفع" : "تم تأكيد الدفع وجارٍ تجهيز التسليم", body: deliveredAll ? "بيانات اشتراكك متاحة في حسابك." : "تم تأكيد الدفع، وسيتابع فريق الدعم تجهيز المنتج." });
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  return { ok: true as const, delivered: deliveredAll };
}
