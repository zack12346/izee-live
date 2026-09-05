import { CheckoutForm } from "@/components/checkout-form";
import { getPaymentSettings } from "@/services/payments";
export default async function CheckoutPage() { const settings = await getPaymentSettings(); return <main className="container-shell section-space"><p className="eyebrow">الخطوة الأخيرة</p><h1 className="mt-2 text-4xl font-black">إتمام الطلب</h1><p className="mt-3 text-muted-foreground">اختر طريقة الدفع وأكمل بيانات العملية.</p><CheckoutForm settings={settings} /></main>; }
