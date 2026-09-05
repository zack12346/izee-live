import { Search } from "lucide-react";
import { getCategories, getProducts } from "@/services/catalog";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : undefined;
  const sort = params.sort === "price-asc" || params.sort === "price-desc" || params.sort === "best" ? params.sort : "new";
  const [result, categories] = await Promise.all([getProducts({ query, sort, onSale: params.sale === "1" }), getCategories()]);
  return <main className="container-shell section-space"><div className="flex flex-col justify-between gap-6 border-b pb-8 md:flex-row md:items-end"><div><p className="eyebrow">المتجر</p><h1 className="mt-2 text-4xl font-black">كل ما تحتاجه رقمياً</h1><p className="mt-3 text-muted-foreground">{result.total} منتجاً جاهزاً لك</p></div><form className="flex w-full max-w-md gap-2"><Input name="q" defaultValue={query} placeholder="ابحث عن كتاب، قالب..." /><Button aria-label="بحث"><Search /></Button></form></div><div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]"><aside className="space-y-5"><h2 className="font-bold">التصنيفات</h2><div className="grid gap-2 text-sm">{categories.map((category) => <a className="rounded-lg px-3 py-2 transition hover:bg-muted hover:text-primary" key={category.id} href={`/categories/${category.slug}`}>{category.name}</a>)}</div><div className="border-t pt-5"><h2 className="font-bold">الترتيب</h2><div className="mt-3 grid gap-2 text-sm"><a href="/shop?sort=new">الأحدث</a><a href="/shop?sort=best">الأكثر مبيعاً</a><a href="/shop?sort=price-asc">الأقل سعراً</a></div></div></aside><section><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{result.products.map((product) => <ProductCard key={product.id} product={product} />)}</div>{!result.products.length ? <p className="rounded-2xl border border-dashed p-16 text-center text-muted-foreground">لم نعثر على منتجات مطابقة.</p> : null}</section></div></main>;
}
