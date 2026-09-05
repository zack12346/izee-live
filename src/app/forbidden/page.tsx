import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return <main className="container-shell flex min-h-[70vh] flex-col items-center justify-center text-center"><p className="eyebrow text-amber-500">403</p><h1 className="mt-4 text-4xl font-black">تم حظر هذا الطلب</h1><p className="mt-4 max-w-lg text-muted-foreground">تم رفض الوصول لأسباب أمنية. إذا كنت تعتقد أن هذا حدث بالخطأ، تواصل مع الدعم.</p><Button className="mt-8" render={<Link href="/" />}>العودة للرئيسية</Button></main>;
}