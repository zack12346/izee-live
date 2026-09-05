import type { Metadata } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Izée live | سوق المنتجات الرقمية", template: "%s | Izée live" },
  description: "سوق عربي موثوق للكتب والقوالب والملفات الرقمية.",
  keywords: ["منتجات رقمية", "كتب إلكترونية", "قوالب", "Izée live"],
  openGraph: { title: "Izée live | سوق المنتجات الرقمية", description: "اكتشف منتجات رقمية تصنع الفرق.", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Providers><SiteHeader />{children}<SiteFooter /></Providers></body>
    </html>
  );
}
