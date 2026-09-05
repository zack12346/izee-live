"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Star, Zap } from "lucide-react";
import type { PublicProduct } from "@/types";
import { accountTypeLabel, durationLabel, formatPrice, discountPercent, fileTypeLabel } from "@/lib/format";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ProductCard({ product }: { product: PublicProduct }) {
  const addItem = useCartStore((state) => state.addItem);
  const image = product.images?.[0]?.url;
  const discount = discountPercent(Number(product.price), product.compare_price);
  const subscriptionLabel = { shared_account: "حساب مشترك", private_profile: "ملف خاص", full_account: "حساب كامل", activation_link: "رابط تفعيل", none: "" }[product.subscription_type];
  const duration = durationLabel(product.duration_value, product.duration_unit);
  return <article className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 transition-all hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-2xl hover:shadow-black/30">
    <Link href={`/products/${product.slug}`} className="block">
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-800">
        {image ? <Image src={image} alt={product.images?.[0]?.alt ?? product.name} fill className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-5xl font-black text-primary/20">{product.name.slice(0, 1)}</div>}
        {discount > 0 ? <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-black">خصم {discount}%</span> : null}
        <span className="absolute bottom-3 left-3 rounded-full bg-zinc-950/90 px-3 py-1 text-xs font-bold text-amber-400">{fileTypeLabel(product.file_type)}</span>
      </div>
    </Link>
    <div className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400"><span>{product.category?.name ?? "منتج رقمي"}</span><span className="flex items-center gap-1 text-amber-400"><Star className="size-3.5 fill-current" /> {Number(product.rating_avg).toFixed(1)}</span></div>
      <Link href={`/products/${product.slug}`}><h3 className="line-clamp-2 min-h-12 font-bold leading-6 transition-colors group-hover:text-amber-400">{product.name}</h3></Link>
      {product.subscription_type !== "none" ? <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300"><Zap className="size-3" />{accountTypeLabel(product.account_type)}</span>{duration ? <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">{duration}</span> : null}{product.available_inventory ? <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">متوفر الآن</span> : null}</div> : subscriptionLabel ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300"><Zap className="size-3" />{subscriptionLabel}</span> : null}
      <p className="line-clamp-2 text-sm leading-6 text-zinc-400">{product.short_description}</p>
      <div className="flex items-center justify-between gap-3 pt-1"><div><strong className="text-xl font-black text-amber-400">{formatPrice(product.price)}</strong>{product.compare_price ? <del className="mr-2 text-xs text-zinc-500">{formatPrice(product.compare_price)}</del> : null}</div></div>
      <div className="grid grid-cols-2 gap-2 pt-2"><Button type="button" className="col-span-2 bg-amber-400 font-bold text-black hover:bg-amber-500" onClick={() => { addItem(product.id); toast.success("أُضيف المنتج إلى السلة"); }}><ShoppingBag /> أضف للسلة</Button><Button type="button" variant="outline" className="col-span-2 border-amber-400/60 text-amber-400 hover:bg-amber-400 hover:text-black" render={<Link href={`/products/${product.slug}`} />}>اشتر الآن</Button></div>
    </div>
  </article>;
}
