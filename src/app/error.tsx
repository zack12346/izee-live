"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="container-shell flex min-h-[65vh] flex-col items-center justify-center text-center"><h1 className="text-3xl font-black">حدث خطأ غير متوقع</h1><p className="mt-3 text-muted-foreground">حاول تحديث الصفحة أو العودة بعد قليل.</p><Button className="mt-7" onClick={reset}>إعادة المحاولة</Button></main>; }
