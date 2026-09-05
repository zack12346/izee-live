import Link from "next/link";
import Image from "next/image";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

export function SiteFooter() {
  return <footer className="mt-auto border-t border-zinc-800 bg-zinc-950 text-zinc-100">
    <div className="container-shell grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
      <div><div className="flex items-center gap-3 text-xl font-black"><Image src="/logo.png" alt={SITE_NAME} width={160} height={40} className="h-10 w-auto object-contain" /></div><p className="mt-5 max-w-sm text-sm leading-7 text-zinc-400">منتجات رقمية منتقاة تساعدك على التعلم، البناء، والإنجاز بثقة.</p></div>
      <div><h2 className="font-bold">روابط سريعة</h2><div className="mt-4 grid gap-3 text-sm text-zinc-400"><Link className="hover:text-amber-400" href="/shop">تصفح المتجر</Link><Link className="hover:text-amber-400" href="/categories">التصنيفات</Link><Link className="hover:text-amber-400" href="/account/orders">طلباتي</Link><Link className="hover:text-amber-400" href="/contact">تواصل معنا</Link></div></div>
      <div><h2 className="font-bold">لماذا Izée live؟</h2><div className="mt-4 grid gap-4 text-sm text-zinc-400"><p className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-amber-400" />تحميل آمن بعد الدفع</p><p className="flex gap-2"><Sparkles className="size-5 shrink-0 text-amber-400" />جودة منتقاة بعناية</p><p className="flex gap-2"><Mail className="size-5 shrink-0 text-amber-400" />دعم عربي سريع</p></div></div>
    </div><div className="border-t border-zinc-800 py-5 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Izée live. جميع الحقوق محفوظة.</div>
  </footer>;
}
