export type UserRole = "customer" | "admin";
export type OrderStatus = "pending" | "processing" | "paid" | "completed" | "failed" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "under_review" | "confirmed" | "rejected" | "failed" | "cancelled";
export type PaymentProvider =
  | "test"
  | "manual"
  | "flexy"
  | "cib"
  | "edahabia"
  | "baridimob"
  | "ccp"
  | "other";
export type CouponType = "percentage" | "fixed";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type SubscriptionType = "shared_account" | "private_profile" | "full_account" | "activation_link" | "none";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_price: number | null;
  category_id: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string;
  file_size: number;
  version: string;
  tags: string[];
  subscription_type: SubscriptionType;
  delivery_payload: string | null;
  account_type: "shared_profile" | "full_private_account";
  duration_value: number | null;
  duration_unit: string | null;
  featured: boolean;
  published: boolean;
  sales_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
};

export type DigitalInventory = {
  id: string;
  product_id: string;
  email: string | null;
  password: string | null;
  profile_name: string | null;
  pin: string | null;
  activation_code: string | null;
  activation_link: string | null;
  instructions: string | null;
  status: "available" | "reserved" | "sold" | "delivered";
  order_id: string | null;
  delivered_to: string | null;
  delivered_at: string | null;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
};

export type PublicProduct = Omit<Product, "file_path" | "delivery_payload"> & {
  category?: Category | null;
  images?: ProductImage[];
  available_inventory?: boolean;
};

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  min_order: number;
  active: boolean;
  product_ids: string[];
  category_ids: string[];
};

export type Order = {
  id: string;
  user_id: string;
  order_number: string | null;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  coupon_id: string | null;
  coupon_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
};

export type Payment = {
  id: string;
  order_id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  reference: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Download = {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string;
  download_count: number;
  last_downloaded_at: string | null;
  created_at: string;
  product?: PublicProduct;
};

export type Review = {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
  profile?: Pick<Profile, "full_name" | "avatar_url">;
};

export type Favorite = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: PublicProduct;
};

export type CartLineInput = {
  productId: string;
  quantity: number;
};

export type SiteSettings = {
  store_name: string;
  currency: string;
  support_email: string;
  phone: string;
};
