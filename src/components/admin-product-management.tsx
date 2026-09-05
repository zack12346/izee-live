"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProductAction, saveProductAction } from "@/services/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/types";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_price: number | null;
  category_id: string | null;
  file_name: string | null;
  file_type: string;
  version: string;
  featured: boolean;
  published: boolean;
  subscription_type: "shared_account" | "private_profile" | "full_account" | "activation_link" | "none";
  delivery_payload: string | null;
  account_type: "shared_profile" | "full_private_account";
  duration_value: number | null;
  duration_unit: string | null;
  category?: { id: string; name: string } | null;
  images?: Array<{ url: string; alt: string | null }>;
};

type ProductFormProps = {
  product?: AdminProduct | null;
  categories: Category[];
  onClose: () => void;
};

function ProductForm({ product, categories, onClose }: ProductFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const result = await saveProductAction(new FormData(form), product?.id);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(product ? "تم تحديث المنتج." : "تمت إضافة المنتج.");
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="product-form-title">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">إدارة المنتجات</p>
            <h2 id="product-form-title" className="mt-1 text-2xl font-black">{product ? "تعديل المنتج" : "إضافة منتج"}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق"><X /></Button>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="product-name">العنوان</Label>
            <Input id="product-name" name="name" defaultValue={product?.name ?? ""} required minLength={2} maxLength={160} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-description">الوصف</Label>
            <Textarea id="product-description" name="description" defaultValue={product?.description ?? ""} required minLength={10} rows={5} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="product-price">السعر</Label>
              <Input id="product-price" name="price" type="number" min="0" step="0.01" defaultValue={product?.price ?? 0} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-category">التصنيف</Label>
              <select id="product-category" name="category_id" defaultValue={product?.category_id ?? ""} className="h-9 rounded-lg border bg-background px-3 text-sm">
                <option value="">بدون تصنيف</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="grid gap-2"><Label htmlFor="account-type">نوع الحساب</Label><select id="account-type" name="account_type" defaultValue={product?.account_type ?? "shared_profile"} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="shared_profile">شاشة مشتركة / Shared Profile</option><option value="full_private_account">حساب كامل / Full Private Account</option></select></div>
            <div className="grid gap-2"><Label htmlFor="duration-value">المدة</Label><Input id="duration-value" name="duration_value" type="number" min="1" defaultValue={product?.duration_value ?? ""} /></div>
            <div className="grid gap-2"><Label htmlFor="duration-unit">وحدة المدة</Label><select id="duration-unit" name="duration_unit" defaultValue={product?.duration_unit ?? "month"} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="day">يوم</option><option value="month">شهر</option><option value="year">سنة</option></select></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="subscription-type">نوع الاشتراك</Label>
              <select id="subscription-type" name="subscription_type" defaultValue={product?.subscription_type ?? "none"} className="h-9 rounded-lg border bg-background px-3 text-sm">
                <option value="none">منتج رقمي عادي</option>
                <option value="shared_account">حساب مشترك</option>
                <option value="private_profile">ملف شخصي خاص</option>
                <option value="full_account">حساب كامل</option>
                <option value="activation_link">رابط تفعيل</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="delivery-payload">بيانات التسليم الفوري</Label>
              <Textarea id="delivery-payload" name="delivery_payload" defaultValue={product?.delivery_payload ?? ""} maxLength={5000} rows={3} placeholder="بيانات الحساب أو كود التفعيل أو تعليمات التسليم" />
              <p className="text-xs text-muted-foreground">تُحفظ على الخادم ولا تظهر في بطاقة المنتج العامة.</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="product-image">صورة المنتج</Label>
              <Input id="product-image" name="image" type="file" accept="image/*" />
              {product?.images?.[0] ? <p className="text-xs text-muted-foreground">الصورة الحالية محفوظة، ارفع صورة جديدة لاستبدالها.</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-file">ملف المنتج</Label>
              <Input id="product-file" name="file" type="file" />
              {product?.file_name ? <p className="text-xs text-muted-foreground">الملف الحالي: {product.file_name}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input name="published" type="checkbox" defaultChecked={product?.published ?? false} /> نشر المنتج</label>
            <label className="flex items-center gap-2"><input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} /> منتج مميز</label>
          </div>
          <fieldset className="grid gap-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
            <legend className="px-2 text-sm font-bold text-amber-600">مخزون التسليم السري</legend>
            <p className="text-xs text-muted-foreground">هذه البيانات لا تظهر للعامة، وتُسلّم فقط بعد قبول الدفع.</p>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="inventory-email">Email</Label><Input id="inventory-email" name="inventory_email" type="email" autoComplete="off" /></div><div><Label htmlFor="inventory-password">Password</Label><Input id="inventory-password" name="inventory_password" type="password" autoComplete="new-password" /></div><div><Label htmlFor="inventory-profile-name">Profile Name</Label><Input id="inventory-profile-name" name="inventory_profile_name" autoComplete="off" /></div><div><Label htmlFor="inventory-pin">PIN</Label><Input id="inventory-pin" name="inventory_pin" type="password" autoComplete="off" /></div><div><Label htmlFor="activation-code">Activation Code</Label><Input id="activation-code" name="activation_code" autoComplete="off" /></div><div><Label htmlFor="activation-link">Activation Link</Label><Input id="activation-link" name="activation_link" type="url" autoComplete="off" /></div></div>
            <div><Label htmlFor="inventory-instructions">تعليمات التسليم</Label><Textarea id="inventory-instructions" name="inventory_instructions" rows={3} /></div>
          </fieldset>
          <div className="flex justify-end gap-3 border-t pt-5">
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : product ? "حفظ التعديلات" : "إضافة المنتج"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminProductManagement({ products, categories, initialOpen = false }: { products: AdminProduct[]; categories: Category[]; initialOpen?: boolean }) {
  const [formProduct, setFormProduct] = useState<AdminProduct | null | undefined>(initialOpen ? null : undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function removeProduct(product: AdminProduct) {
    if (!window.confirm(`هل تريد حذف المنتج «${product.name}»؟`)) return;
    setDeletingId(product.id);
    const result = await deleteProductAction(product.id);
    setDeletingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("تم حذف المنتج.");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">إجمالي المنتجات</p><p className="mt-1 text-3xl font-black">{products.length}</p></div>
        <Button onClick={() => setFormProduct(null)}><Plus /> إضافة منتج</Button>
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl border bg-card">
        <div className="hidden grid-cols-[1fr_140px_120px_150px] gap-4 border-b bg-muted/40 px-5 py-4 text-sm font-bold md:grid"><span>المنتج</span><span>التصنيف</span><span>الحالة</span><span>الإجراءات</span></div>
        {products.length ? products.map((product) => (
          <div key={product.id} className="grid gap-4 border-b p-5 last:border-b-0 md:grid-cols-[1fr_140px_120px_150px] md:items-center">
            <div className="flex min-w-0 items-center gap-3">
              {product.images?.[0] ? <img src={product.images[0].url} alt={product.images[0].alt ?? product.name} className="size-12 rounded-lg object-cover" /> : <div className="grid size-12 place-items-center rounded-lg bg-muted text-xs">بدون صورة</div>}
              <div className="min-w-0"><p className="truncate font-bold">{product.name}</p><p className="text-sm text-muted-foreground">{Number(product.price).toLocaleString("ar-DZ")} دج</p></div>
            </div>
            <span className="text-sm text-muted-foreground">{product.category?.name ?? "بدون تصنيف"}</span>
            <span className={product.published ? "text-sm font-semibold text-emerald-600" : "text-sm text-muted-foreground"}>{product.published ? "منشور" : "مسودة"}</span>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setFormProduct(product)}><Pencil /> تعديل</Button><Button variant="destructive" size="sm" onClick={() => removeProduct(product)} disabled={deletingId === product.id}><Trash2 /> حذف</Button></div>
          </div>
        )) : <div className="p-12 text-center text-muted-foreground">لا توجد منتجات بعد. أضف أول منتج من الزر أعلاه.</div>}
      </div>
      {formProduct !== undefined ? <ProductForm product={formProduct} categories={categories} onClose={() => setFormProduct(undefined)} /> : null}
    </>
  );
}
