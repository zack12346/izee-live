import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getProducts } from "@/services/catalog";
import { getAdminOrderCount, getAdminOrders, getAdminProducts } from "@/services/admin";
import { AdminProductManagement } from "@/components/admin-product-management";
import { AdminOrderManagement } from "@/components/admin-order-management";
import { Button } from "@/components/ui/button";

const labels: Record<string, string> = {
  products: "المنتجات",
  categories: "التصنيفات",
  orders: "الطلبات",
  customers: "العملاء",
  reviews: "التقييمات",
  coupons: "الكوبونات",
  analytics: "التحليلات",
  settings: "الإعدادات",
};

export default async function AdminSection({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ action?: string }> }) {
  await requireAdmin();
  const { section } = await params;
  const query = await searchParams;

  if (section === "products") {
    const [products, categories] = await Promise.all([getAdminProducts(), getCategories()]);
    return (
      <main className="container-shell section-space">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="eyebrow">لوحة الإدارة</p><h1 className="mt-2 text-4xl font-black">إدارة المنتجات</h1></div>
          <Button variant="outline" render={<Link href="/admin" />}>العودة للوحة</Button>
        </div>
        <div className="mt-10"><AdminProductManagement products={products} categories={categories} initialOpen={query.action === "add"} /></div>
      </main>
    );
  }

  if (section === "orders") {
    const orders = await getAdminOrders();
    return (
      <main className="container-shell section-space">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">لوحة الإدارة</p><h1 className="mt-2 text-4xl font-black">مراجعة الطلبات والدفع</h1></div><Button variant="outline" render={<Link href="/admin" />}>العودة للوحة</Button></div>
        <div className="mt-10"><AdminOrderManagement orders={orders} /></div>
      </main>
    );
  }

  const title = labels[section] ?? "الإدارة";
  const [products, categories, orderCount] = await Promise.all([
    getProducts({ pageSize: 100 }),
    getCategories(),
    getAdminOrderCount(),
  ]);
  const count = section === "categories" ? categories.length : section === "orders" ? orderCount : products.total;

  return (
    <main className="container-shell section-space">
      <div className="flex items-end justify-between">
        <div><p className="eyebrow">لوحة الإدارة</p><h1 className="mt-2 text-4xl font-black">{title}</h1></div>
        <Button render={<Link href="/admin" />}>العودة للوحة</Button>
      </div>
      <div className="mt-10 rounded-2xl border bg-card p-8">
        <p className="text-sm text-muted-foreground">العناصر المسجلة</p>
        <p className="mt-2 text-4xl font-black">{count}</p>
        <p className="mt-5 leading-7 text-muted-foreground">هذه المساحة متصلة ببيانات Supabase الحالية.</p>
      </div>
    </main>
  );
}
