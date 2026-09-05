"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, FileImage, Phone, ReceiptText, ShieldCheck } from "lucide-react";
import { checkoutAction } from "@/services/checkout";
import { useCartStore } from "@/store/cart";
import type { PaymentSettings } from "@/services/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Provider = "baridimob" | "ccp" | "flexy";

export function CheckoutForm({ settings }: { settings: PaymentSettings }) {
  const items = useCartStore((state) => state.items);
  const couponCode = useCartStore((state) => state.couponCode);
  const clear = useCartStore((state) => state.clear);
  const [provider, setProvider] = useState<Provider>(settings.baridimob_enabled ? "baridimob" : settings.ccp_enabled ? "ccp" : "flexy");
  const [busy, setBusy] = useState(false);

  const paymentOptions = [
    settings.baridimob_enabled ? { id: "baridimob" as const, label: "بريدي موب", text: settings.baridimob_instructions, icon: ReceiptText } : null,
    settings.ccp_enabled ? { id: "ccp" as const, label: "CCP", text: settings.ccp_instructions, icon: CreditCard } : null,
    settings.flexy_enabled ? { id: "flexy" as const, label: "فليكسي", text: settings.flexy_instructions, icon: Phone } : null,
  ].filter(Boolean) as Array<{ id: Provider; label: string; text: string; icon: typeof ReceiptText }>;
  const selected = paymentOptions.find((option) => option.id === provider) ?? paymentOptions[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || !selected) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const result = await checkoutAction({
      items,
      couponCode,
      provider,
      reference: String(form.get("reference") ?? ""),
      customerPhone: String(form.get("customerPhone") ?? ""),
      receipt: form.get("receipt"),
    });
    setBusy(false);
    if (!result.ok) return;
    clear();
    window.location.assign(`/account/orders?created=${result.orderNumber}`);
  }

  if (!paymentOptions.length) return <p className="mt-10 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">لا توجد طريقة دفع مفعلة حاليًا.</p>;

  return (
    <form onSubmit={submit} encType="multipart/form-data" className="mt-10 max-w-3xl rounded-2xl border bg-card p-6">
      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-sm"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><p>الدفع يدوي ويصبح الطلب قيد المراجعة حتى يتحقق المدير من المرجع والوصل.</p></div>
      <div className="mt-6 grid gap-3"><Label>طرق الدفع</Label><div className="grid gap-3 sm:grid-cols-3">{paymentOptions.map((option) => { const Icon = option.icon; return <label key={option.id} className={`cursor-pointer rounded-xl border p-4 transition ${provider === option.id ? "border-amber-400 bg-amber-400/10" : "hover:border-amber-400/60"}`}><input className="sr-only" type="radio" name="provider" checked={provider === option.id} onChange={() => setProvider(option.id)} /><Icon className="size-6 text-amber-500" /><span className="mt-3 block font-bold">{option.label}</span></label>; })}</div></div>
      <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-5 text-sm leading-7"><p className="font-bold">{selected.label}</p>{settings.account_holder ? <p>صاحب الحساب: {settings.account_holder}</p> : null}{provider === "baridimob" && settings.baridimob_number ? <p>RIP / الرقم: {settings.baridimob_number}</p> : null}{provider === "ccp" && settings.ccp_number ? <p>CCP: {settings.ccp_number}</p> : null}{provider === "flexy" && settings.flexy_phone ? <p>الهاتف: {settings.flexy_phone}</p> : null}<p className="mt-2 text-muted-foreground">{selected.text}</p></div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2"><div><Label htmlFor="reference">رقم مرجع العملية *</Label><Input id="reference" name="reference" required className="mt-2" placeholder="رقم العملية" /></div>{provider === "flexy" ? <div><Label htmlFor="customerPhone">رقم هاتف Flexy</Label><Input id="customerPhone" name="customerPhone" type="tel" className="mt-2" placeholder="05xxxxxxxx" /></div> : null}</div>
      {provider !== "flexy" ? <div className="mt-5"><Label htmlFor="receipt">وصل الدفع *</Label><div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed p-4"><FileImage className="size-5 text-primary" /><Input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp" required /></div><p className="mt-2 text-xs text-muted-foreground">JPG أو PNG أو WebP، بحد أقصى 5 ميغابايت.</p></div> : null}
      <div className="mt-6 flex gap-3"><Button disabled={busy || !items.length} size="lg">{busy ? "جارٍ إرسال الطلب..." : "إرسال الطلب للمراجعة"}</Button><Button variant="outline" render={<Link href="/cart" />}>العودة للسلة</Button></div>
    </form>
  );
}
