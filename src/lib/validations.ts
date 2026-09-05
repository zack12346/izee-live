import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("أدخل بريداً إلكترونياً صالحاً"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "أدخل الاسم الكامل").max(80),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("أدخل بريداً إلكترونياً صالحاً"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

export const profileSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, "السلة فارغة"),
  couponCode: z.string().trim().max(40).regex(/^[a-zA-Z0-9_-]*$/, "رمز الكوبون غير صالح").optional(),
  provider: z.enum(["test", "manual", "baridimob", "ccp", "flexy"]),
  notes: z.string().trim().max(500).optional(),
  reference: z.string().trim().max(120).regex(/^[\p{L}\p{N}._/-]*$/u, "رقم المرجع غير صالح").optional(),
  customerPhone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, "رقم الهاتف غير صالح").optional(),
  receipt: z.instanceof(File).optional(),
});

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(8, "اكتب تعليقاً أوضح").max(1000),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "الرابط المختصر غير صالح"),
  description: z.string().trim().min(10),
  short_description: z.string().trim().min(8).max(280),
  price: z.coerce.number().min(0),
  compare_price: z.coerce.number().min(0).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  file_type: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9+.-]+$/, "نوع الملف غير صالح"),
  version: z.string().trim().min(1).max(20),
  tags: z.string().trim().max(500).optional(),
  subscription_type: z.enum(["shared_account", "private_profile", "full_account", "activation_link", "none"]).default("none"),
  delivery_payload: z.string().max(5000).optional().nullable(),
  account_type: z.enum(["shared_profile", "full_private_account"]).default("shared_profile"),
  duration_value: z.coerce.number().int().min(1).optional().nullable(),
  duration_unit: z.enum(["month", "year", "day"]).optional().nullable(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  description: z.string().max(400).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(40),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().min(0),
  starts_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  usage_limit: z.coerce.number().int().min(1).optional().nullable(),
  min_order: z.coerce.number().min(0).optional(),
  active: z.boolean().optional(),
});

export const newsletterSchema = z.object({
  email: z.string().email("أدخل بريداً صالحاً"),
});

export const settingsSchema = z.object({
  store_name: z.string().min(2),
  currency: z.string().min(3).max(8),
  support_email: z.string().email(),
  phone: z.string().min(6).max(40),
});

export const paymentSettingsSchema = z.object({
  baridimob_number: z.string().max(80),
  ccp_number: z.string().max(80),
  account_holder: z.string().min(2).max(120),
  baridimob_instructions: z.string().max(1000),
  ccp_instructions: z.string().max(1000),
  flexy_phone: z.string().max(40),
  flexy_instructions: z.string().max(1000),
  baridimob_enabled: z.boolean(),
  ccp_enabled: z.boolean(),
  flexy_enabled: z.boolean(),
});
