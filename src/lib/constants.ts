export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Izée live";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const CURRENCY_CODE = "DZD";
export const CURRENCY_LABEL = "د.ج";

export const FILE_TYPES = [
  "pdf",
  "epub",
  "xlsx",
  "docx",
  "pptx",
  "zip",
  "image",
  "video",
  "software",
  "other",
] as const;

export const PAGE_SIZE = 12;

export const STORAGE_IMAGES_BUCKET = "product-images";
export const STORAGE_FILES_BUCKET = "product-files";

export const ENABLED_PAYMENTS = ["test", "manual"] as const;

export const ADMIN_NAV = [
  { href: "/admin", label: "لوحة التحكم" },
  { href: "/admin/products", label: "المنتجات" },
  { href: "/admin/categories", label: "التصنيفات" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/customers", label: "العملاء" },
  { href: "/admin/reviews", label: "التقييمات" },
  { href: "/admin/coupons", label: "الكوبونات" },
  { href: "/admin/analytics", label: "التحليلات" },
  { href: "/admin/settings", label: "الإعدادات" },
] as const;

export const ACCOUNT_NAV = [
  { href: "/account", label: "نظرة عامة" },
  { href: "/account/profile", label: "الملف الشخصي" },
  { href: "/account/orders", label: "طلباتي" },
  { href: "/account/downloads", label: "تحميلاتي" },
  { href: "/account/deliveries", label: "بيانات اشتراكاتي" },
  { href: "/account/favorites", label: "المفضلة" },
  { href: "/account/reviews", label: "تقييماتي" },
  { href: "/account/settings", label: "الإعدادات" },
] as const;
