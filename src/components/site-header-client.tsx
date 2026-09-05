"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, LogOut, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCartCount } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function SiteHeaderClient({ isAdmin }: { isAdmin: boolean }) {
  const count = useCartCount();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    setIsOpen(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error);
      toast.error("تعذر تسجيل الخروج. حاول مرة أخرى.");
      setLoggingOut(false);
      return;
    }
    toast.success("تم تسجيل الخروج.");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 text-zinc-100 backdrop-blur">
      <div className="container-shell flex min-h-20 items-center justify-between gap-5 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Izée live الرئيسية">
          <Image src="/logo.png" alt="Izée live" width={160} height={40} className="h-10 w-auto object-contain" priority />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold lg:flex">
          <Link className="transition-colors hover:text-amber-400" href="/shop">المتجر</Link>
          <Link className="transition-colors hover:text-amber-400" href="/categories">التصنيفات</Link>
          <Link className="transition-colors hover:text-amber-400" href="/shop?sort=best">الأكثر مبيعاً</Link>
          <Link className="transition-colors hover:text-amber-400" href="/shop?sale=1">العروض</Link>
          {isAdmin ? <Link className="text-amber-400 transition-colors hover:text-amber-300" href="/admin">لوحة التحكم</Link> : null}
        </nav>
        <div className="flex items-center gap-1">
          {isAdmin ? <Button size="sm" className="hidden bg-amber-400 text-black hover:bg-amber-300 sm:inline-flex" render={<Link href="/admin/products?action=add" />}>إضافة منتج</Button> : null}
          <Button variant="ghost" size="icon" className="text-zinc-200 hover:bg-zinc-800 hover:text-amber-400" render={<Link href="/shop" />} aria-label="بحث"><Search /></Button>
          <Button variant="ghost" size="icon" className="text-zinc-200 hover:bg-zinc-800 hover:text-amber-400" render={<Link href="/account/favorites" />} aria-label="المفضلة"><Heart /></Button>
          <Button variant="ghost" size="icon" className="relative text-zinc-200 hover:bg-zinc-800 hover:text-amber-400" render={<Link href="/cart" />} aria-label="السلة">
            <ShoppingBag />
            {count > 0 ? <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">{count}</span> : null}
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-200 hover:bg-zinc-800 hover:text-amber-400" render={<Link href="/account" />} aria-label="الحساب"><UserRound /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-zinc-200 hover:bg-zinc-800 hover:text-amber-400" onClick={handleLogout} disabled={loggingOut} aria-label="تسجيل الخروج"><LogOut /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-zinc-200 hover:bg-zinc-800 hover:text-amber-400 lg:hidden" onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={isOpen} aria-controls="mobile-navigation"><Menu /></Button>
        </div>
      </div>
      <Sheet open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <SheetContent id="mobile-navigation" side="right" className="w-[min(88vw,22rem)] border-zinc-800 bg-zinc-950 text-zinc-100" showCloseButton={false}>
          <SheetHeader className="border-b border-zinc-800 p-6 text-right">
            <div className="flex items-center justify-between gap-4">
              <SheetTitle className="text-lg text-white">قائمة Izée live</SheetTitle>
              <Button type="button" variant="ghost" size="icon" onClick={closeMenu} aria-label="إغلاق القائمة"><X /></Button>
            </div>
            <SheetDescription className="text-right text-zinc-400">تصفح المتجر وحسابك بسرعة.</SheetDescription>
          </SheetHeader>
          <nav className="grid gap-2 p-6 text-right" aria-label="التنقل المحمول">
            <Link href="/shop" onClick={closeMenu} className="rounded-xl px-4 py-3 font-semibold transition hover:bg-zinc-800 hover:text-amber-400">المنتجات</Link>
            <Link href="/categories" onClick={closeMenu} className="rounded-xl px-4 py-3 font-semibold transition hover:bg-zinc-800 hover:text-amber-400">التصنيفات</Link>
            <Link href="/shop?sort=best" onClick={closeMenu} className="rounded-xl px-4 py-3 font-semibold transition hover:bg-zinc-800 hover:text-amber-400">الأكثر مبيعًا</Link>
            <Link href="/shop?sale=1" onClick={closeMenu} className="rounded-xl px-4 py-3 font-semibold transition hover:bg-zinc-800 hover:text-amber-400">العروض</Link>
            <Link href="mailto:support@izee.live" onClick={closeMenu} className="rounded-xl px-4 py-3 font-semibold transition hover:bg-zinc-800 hover:text-amber-400">الدعم</Link>
            {isAdmin ? <><div className="my-3 border-t border-zinc-800" /><Link href="/admin" onClick={closeMenu} className="rounded-xl px-4 py-3 font-semibold text-amber-400 transition hover:bg-zinc-800">لوحة التحكم</Link><Link href="/admin/products?action=add" onClick={closeMenu} className="rounded-xl bg-amber-400 px-4 py-3 text-center font-bold text-black transition hover:bg-amber-300">إضافة منتج</Link></> : null}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
