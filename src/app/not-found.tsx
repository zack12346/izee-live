import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <main className="container-shell flex min-h-[65vh] flex-col items-center justify-center text-center"><p className="eyebrow">404</p><h1 className="mt-4 text-4xl font-black">هذه الصفحة غير موجودة</h1><p className="mt-3 text-muted-foreground">ربما تغير الرابط أو لم يعد المنتج متاحاً.</p><Button className="mt-7" render={<Link href="/">العودة للرئيسية</Link>} /></main>; }
