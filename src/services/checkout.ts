"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireUser } from "@/lib/auth";
import { calculateCart } from "@/lib/pricing";
import { checkoutSchema } from "@/lib/validations";
import { getGateway } from "@/services/payments";
import type { Coupon, Product } from "@/types";

const RECEIPT_BUCKET = "payment-receipts";
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function fulfillPaidOrder(orderId: string, userId: string) {
  const admin = createAdminClient();
  const { data: items } = await admin.from("order_items").select("*").eq("order_id", orderId);
  for (const item of items ?? []) {
    await admin.from("downloads").upsert(
      {
        user_id: userId,
        product_id: item.product_id,
        order_id: orderId,
      },
      { onConflict: "user_id,product_id,order_id" },
    );
    await admin.rpc("increment_product_sales", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
    await admin.from("notifications").insert({
      user_id: userId,
      title: "المنتج جاهز للتحميل",
      body: `يمكنك تحميل ${item.name} من صفحة التحميلات.`,
    });
  }
}

export async function previewCoupon(code: string, items: Array<{ productId: string; quantity: number }>) {
  if (!code.trim()) return { discount: 0, error: null as string | null };
  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (!coupon) return { discount: 0, error: "الكوبون غير صالح" };

  const productIds = items.map((item) => item.productId);
  const { data: products } = await admin.from("products").select("*").in("id", productIds);
  const qty = new Map(items.map((item) => [item.productId, item.quantity]));
  const priced = calculateCart(
    ((products ?? []) as Product[]).map((product) => ({
      product,
      quantity: qty.get(product.id) ?? 1,
    })),
    coupon as Coupon,
  );
  if (priced.discount <= 0) return { discount: 0, error: "لا يمكن استخدام هذا الكوبون على السلة الحالية" };
  return { discount: priced.discount, error: null };
}

export async function checkoutAction(input: unknown) {
  const user = await requireUser();
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const { items, couponCode, provider, notes, reference, customerPhone, receipt } = parsed.data;
  const requiresReference = provider === "baridimob" || provider === "ccp" || provider === "flexy";
  if (requiresReference && !reference?.trim()) {
    return { ok: false as const, error: "رقم مرجع العملية مطلوب لهذه الطريقة." };
  }
  if ((provider === "baridimob" || provider === "ccp") && (!receipt || receipt.size === 0)) {
    return { ok: false as const, error: "يرجى رفع وصل الدفع قبل إرسال الطلب." };
  }
  if (receipt && receipt.size > 0 && (!RECEIPT_TYPES.has(receipt.type) || receipt.size > MAX_RECEIPT_SIZE)) {
    return { ok: false as const, error: "وصل الدفع يجب أن يكون JPG أو PNG أو WebP وبحجم أقصى 5 ميغابايت." };
  }
  const admin = createAdminClient();

  const uniqueIds = [...new Set(items.map((item) => item.productId))];
  const { data: products, error: productsError } = await admin
    .from("products")
    .select("*")
    .in("id", uniqueIds)
    .eq("published", true);

  if (productsError || !products || products.length !== uniqueIds.length) {
    return { ok: false as const, error: "أحد المنتجات غير متاح." };
  }

  const productMap = new Map((products as Product[]).map((product) => [product.id, product]));
  const cartLines = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("PRODUCT_MISSING");
    return { product, quantity: item.quantity };
  });

  let coupon: Coupon | null = null;
  if (couponCode) {
    const { data } = await admin
      .from("coupons")
      .select("*")
      .eq("code", couponCode.trim().toUpperCase())
      .maybeSingle();
    coupon = (data as Coupon | null) ?? null;
  }

  const priced = calculateCart(cartLines, coupon);
  if (coupon && priced.discount === 0) {
    return { ok: false as const, error: "الكوبون غير صالح لهذه السلة." };
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      payment_method: provider,
      payment_status: provider === "test" ? "confirmed" : "under_review",
      subtotal: priced.subtotal,
      discount: priced.discount,
      total: priced.total,
      coupon_id: coupon?.id ?? null,
      coupon_code: coupon?.code ?? null,
      notes: notes ?? null,
    })
    .select("*")
    .single();

  if (orderError || !order) {
    return { ok: false as const, error: "تعذر إنشاء الطلب." };
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    priced.lines.map((line) => ({
      order_id: order.id,
      product_id: line.product.id,
      name: line.product.name,
      price: line.unitPrice,
      quantity: line.quantity,
      total: line.lineTotal,
    })),
  );

  if (itemsError) {
    await admin.from("orders").delete().eq("id", order.id);
    return { ok: false as const, error: "تعذر حفظ عناصر الطلب." };
  }

  let receiptPath: string | null = null;
  if (receipt && receipt.size > 0) {
    const extension = receipt.type === "image/jpeg" ? "jpg" : receipt.type.split("/")[1];
    receiptPath = `${user.id}/${order.id}/${crypto.randomUUID()}.${extension}`;
    const { error: receiptError } = await admin.storage.from(RECEIPT_BUCKET).upload(receiptPath, receipt, {
      contentType: receipt.type,
      upsert: false,
    });
    if (receiptError) {
      await admin.from("orders").delete().eq("id", order.id);
      return { ok: false as const, error: "تعذر حفظ وصل الدفع." };
    }
  }

  let paymentResult;
  try {
    const gateway = getGateway(provider);
    paymentResult = await gateway.createIntent({
      orderId: order.id,
      amount: priced.total,
      currency: "DZD",
      reference,
      notes,
    });
  } catch (error) {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { ok: false as const, error: error instanceof Error ? error.message : "فشل الدفع" };
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      order_id: order.id,
      provider,
      status: paymentResult.status,
      amount: priced.total,
      currency: "DZD",
      reference: paymentResult.reference,
      transaction_reference: reference?.trim() || paymentResult.reference,
      receipt_path: receiptPath,
      customer_phone: customerPhone?.trim() || null,
      metadata: { notes: notes ?? null },
    })
    .select("*")
    .single();

  if (paymentError || !payment) {
    return { ok: false as const, error: "تعذر تسجيل الدفع." };
  }

  if (paymentResult.status === "confirmed") {
    await admin.from("orders").update({ status: "paid" }).eq("id", order.id);
    if (coupon) {
      await recordCouponUsage(order.id, user.id, coupon);
    }
    try {
      await fulfillPaidOrder(order.id, user.id);
    } catch {
      await incrementSalesFallback(priced.lines.map((line) => ({ id: line.product.id, qty: line.quantity })));
      for (const line of priced.lines) {
        await admin.from("downloads").upsert(
          { user_id: user.id, product_id: line.product.id, order_id: order.id },
          { onConflict: "user_id,product_id,order_id" },
        );
      }
    }
  } else if (paymentResult.status === "failed") {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
  } else if (paymentResult.status === "cancelled") {
    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
  }

  return {
    ok: true as const,
    orderId: order.id,
    orderNumber: (order as { order_number?: string }).order_number ?? order.id,
    paymentStatus: paymentResult.status,
    message: paymentResult.message,
  };
}

async function recordCouponUsage(orderId: string, userId: string, coupon: Coupon) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("coupon_usage")
    .select("id")
    .eq("order_id", orderId)
    .eq("coupon_id", coupon.id)
    .maybeSingle();
  if (existing) return;
  await admin.from("coupon_usage").insert({
    coupon_id: coupon.id,
    user_id: userId,
    order_id: orderId,
  });
  await admin
    .from("coupons")
    .update({ usage_count: coupon.usage_count + 1 })
    .eq("id", coupon.id);
}

async function incrementSalesFallback(lines: Array<{ id: string; qty: number }>) {
  const admin = createAdminClient();
  for (const line of lines) {
    const { data } = await admin.from("products").select("sales_count").eq("id", line.id).single();
    await admin
      .from("products")
      .update({ sales_count: Number(data?.sales_count ?? 0) + line.qty })
      .eq("id", line.id);
  }
}

export async function confirmManualPayment(orderId: string, confirm: boolean) {
  await requireAdmin();
  const parsed = z.object({ orderId: z.string().uuid(), confirm: z.boolean() }).parse({
    orderId,
    confirm,
  });
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", parsed.orderId).eq("status", "pending").maybeSingle();
  if (!order) return { ok: false as const, error: "الطلب غير موجود أو تمت معالجته مسبقاً" };

  if (!confirm) {
    await admin.from("orders").update({ status: "cancelled" }).eq("id", parsed.orderId);
    await admin.from("payments").update({ status: "cancelled" }).eq("order_id", parsed.orderId);
    return { ok: true as const };
  }

  await admin.from("orders").update({ status: "paid" }).eq("id", parsed.orderId);
  await admin.from("payments").update({ status: "confirmed" }).eq("order_id", parsed.orderId);
  if (order.coupon_id) {
    const { data: coupon } = await admin.from("coupons").select("*").eq("id", order.coupon_id).maybeSingle();
    if (coupon) {
      await recordCouponUsage(parsed.orderId, order.user_id, coupon as Coupon);
    }
  }
  try {
    await fulfillPaidOrder(parsed.orderId, order.user_id);
  } catch {
    const { data: items } = await admin.from("order_items").select("*").eq("order_id", parsed.orderId);
    await incrementSalesFallback((items ?? []).map((item) => ({ id: item.product_id, qty: item.quantity })));
    for (const item of items ?? []) {
      await admin.from("downloads").upsert(
        { user_id: order.user_id, product_id: item.product_id, order_id: parsed.orderId },
        { onConflict: "user_id,product_id,order_id" },
      );
    }
  }
  return { ok: true as const };
}
