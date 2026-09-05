import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getPaymentSettings } from "@/services/payments";
import { PaymentSettingsForm } from "@/components/payment-settings-form";
import { Button } from "@/components/ui/button";

export default async function PaymentSettingsPage() {
  await requireAdmin();
  const settings = await getPaymentSettings();
  return (
    <main className="container-shell section-space">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow">لوحة الإدارة</p><h1 className="mt-2 text-4xl font-black">إعدادات الدفع</h1><p className="mt-3 text-muted-foreground">هذه المعلومات ستظهر للمشتري في checkout فقط.</p></div>
        <Button variant="outline" render={<Link href="/admin" />}>العودة للوحة</Button>
      </div>
      <div className="mt-10"><PaymentSettingsForm settings={settings} /></div>
    </main>
  );
}
