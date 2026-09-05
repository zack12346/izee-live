import type { Coupon, Product } from "@/types";

export type PricedLine = {
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function couponAppliesToCart(coupon: Coupon, products: Product[]) {
  if (coupon.product_ids.length === 0 && coupon.category_ids.length === 0) {
    return true;
  }
  return products.some((product) => {
    if (coupon.product_ids.includes(product.id)) return true;
    if (product.category_id && coupon.category_ids.includes(product.category_id)) return true;
    return false;
  });
}

export function calculateDiscount(coupon: Coupon | null, subtotal: number, products: Product[]) {
  if (!coupon) return 0;
  if (!coupon.active) return 0;
  if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) return 0;
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return 0;
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) return 0;
  if (subtotal < Number(coupon.min_order)) return 0;
  if (!couponAppliesToCart(coupon, products)) return 0;

  if (coupon.type === "percentage") {
    return Math.round((subtotal * Number(coupon.value)) / 100);
  }
  return Math.min(Number(coupon.value), subtotal);
}

export function calculateCart(products: Array<{ product: Product; quantity: number }>, coupon: Coupon | null) {
  const lines: PricedLine[] = products.map(({ product, quantity }) => {
    const unitPrice = Number(product.price);
    const qty = Math.max(1, quantity);
    return {
      product,
      quantity: qty,
      unitPrice,
      lineTotal: unitPrice * qty,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = calculateDiscount(
    coupon,
    subtotal,
    lines.map((line) => line.product),
  );
  const total = Math.max(0, subtotal - discount);
  return { lines, subtotal, discount, total };
}
