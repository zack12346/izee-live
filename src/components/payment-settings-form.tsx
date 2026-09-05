"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { savePaymentSettingsAction } from "@/services/admin";
import type { PaymentSettings } from "@/services/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = await savePaymentSettingsAction(new FormData(event.currentTarget));
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("تم حفظ إعدادات الدفع.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-6 rounded-2xl border bg-card p-6">
      <div className="grid gap-2"><Label htmlFor="account-holder">اسم صاحب الحساب</Label><Input id="account-holder" name="account_holder" defaultValue={settings.account_holder} required /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="baridimob-number">RIP / رقم بريدي موب</Label><Input id="baridimob-number" name="baridimob_number" defaultValue={settings.baridimob_number} /></div>
        <div className="grid gap-2"><Label htmlFor="ccp-number">رقم حساب CCP</Label><Input id="ccp-number" name="ccp_number" defaultValue={settings.ccp_number} /></div>
      </div>
      <div className="grid gap-2"><Label htmlFor="baridimob-instructions">تعليمات بريدي موب</Label><Textarea id="baridimob-instructions" name="baridimob_instructions" defaultValue={settings.baridimob_instructions} rows={3} /></div>
      <div className="grid gap-2"><Label htmlFor="ccp-instructions">تعليمات CCP</Label><Textarea id="ccp-instructions" name="ccp_instructions" defaultValue={settings.ccp_instructions} rows={3} /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="flexy-phone">رقم هاتف Flexy</Label><Input id="flexy-phone" name="flexy_phone" defaultValue={settings.flexy_phone} /></div>
        <div className="grid gap-2"><Label htmlFor="flexy-instructions">تعليمات Flexy</Label><Textarea id="flexy-instructions" name="flexy_instructions" defaultValue={settings.flexy_instructions} rows={3} /></div>
      </div>
      <div className="flex flex-wrap gap-5 border-t pt-5 text-sm">
        <label className="flex items-center gap-2"><input name="baridimob_enabled" type="checkbox" defaultChecked={settings.baridimob_enabled} /> تفعيل بريدي موب</label>
        <label className="flex items-center gap-2"><input name="ccp_enabled" type="checkbox" defaultChecked={settings.ccp_enabled} /> تفعيل CCP</label>
        <label className="flex items-center gap-2"><input name="flexy_enabled" type="checkbox" defaultChecked={settings.flexy_enabled} /> تفعيل Flexy</label>
      </div>
      <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ إعدادات الدفع"}</Button>
    </form>
  );
}
