import { notFound } from "next/navigation";
import { Download, FileText, ShieldCheck, Star, Zap } from "lucide-react";
import { getProductBySlug, getProductReviews, getRelatedProducts } from "@/services/catalog";
import { getPaymentSettings } from "@/services/payments";
import { accountTypeLabel, durationLabel, fileTypeLabel, formatBytes, formatPrice } from "@/lib/format";
import { ProductCard } from "@/components/product-card";
import { AddToCart } from "@/components/add-to-cart";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  return { title: product?.name ?? "المنتج", description: product?.short_description ?? "منتج رقمي" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const [reviews, related, paymentSettings] = await Promise.all([getProductReviews(product.id), getRelatedProducts(product), getPaymentSettings()]);
  const duration = durationLabel(product.duration_value, product.duration_unit);
  const paymentMethods = [paymentSettings.baridimob_enabled ? "بريدي موب" : null, paymentSettings.ccp_enabled ? "CCP" : null, paymentSettings.flexy_enabled ? "فليكسي" : null].filter(Boolean);

  return (
    <main className="container-shell section-space">
      <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
        <div className="flex aspect-square items-center justify-center rounded-[2rem] bg-[#e8efe8] text-primary"><FileText className="size-32 stroke-1" /></div>
        <div className="py-5">
          <p className="eyebrow">{product.category?.name ?? "منتج رقمي"}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">{product.name}</h1>
          <div className="mt-4 flex items-center gap-2 text-sm text-[#c58b22]"><Star className="size-4 fill-current" /> {Number(product.rating_avg).toFixed(1)} ({product.rating_count} تقييم)</div>
          {product.subscription_type !== "none" ? <div className="mt-6 flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-600"><Zap className="size-4" />{accountTypeLabel(product.account_type)}</span>{duration ? <span className="rounded-full bg-muted px-4 py-2 text-sm">{duration}</span> : null}<span className={`rounded-full px-4 py-2 text-sm font-bold ${product.available_inventory ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{product.available_inventory ? "متوفر" : "يتطلب مراجعة التوفر"}</span></div> : null}
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{product.description}</p>
          <div className="mt-8 flex items-end gap-3"><strong className="text-3xl">{formatPrice(product.price)}</strong>{product.compare_price ? <del className="text-muted-foreground">{formatPrice(product.compare_price)}</del> : null}</div>
          <AddToCart productId={product.id} />
          <div className="mt-8 grid gap-3 border-t pt-6 text-sm text-muted-foreground"><p className="flex gap-3"><Download className="size-5 text-primary" />{product.available_inventory ? "تسليم رقمي بعد تأكيد الدفع" : "يتم التحقق من التوفر قبل التسليم"}</p><p className="flex gap-3"><ShieldCheck className="size-5 text-primary" />{fileTypeLabel(product.file_type)} · {formatBytes(product.file_size)} · الإصدار {product.version}</p><p>طرق الدفع: {paymentMethods.length ? paymentMethods.join("، ") : "غير مفعلة حاليًا"}</p></div>
        </div>
      </div>
      <section className="mt-20 border-t pt-12"><h2 className="text-2xl font-black">آراء العملاء</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{reviews.map((review) => <blockquote key={review.id} className="rounded-2xl border p-5"><div className="text-[#c58b22]">{"★".repeat(review.rating)}</div><p className="mt-3 leading-7">{review.comment}</p><cite className="mt-3 block text-sm text-muted-foreground">{review.profile?.full_name ?? "عميل Izée live"}</cite></blockquote>)}</div></section>
      {related.length ? <section className="mt-20"><h2 className="text-2xl font-black">قد يعجبك أيضًا</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section> : null}
    </main>
  );
}
