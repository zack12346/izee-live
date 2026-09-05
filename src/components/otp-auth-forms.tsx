"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { OtpInput } from "@/components/otp-input";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupVerificationForm({ email }: { email: string }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token.length !== 6) { toast.error("أدخل رمز التحقق المكوّن من 6 أرقام."); return; }
    setBusy(true);
    const { error } = await createClient().auth.verifyOtp({ email, token, type: "signup" });
    setBusy(false);
    if (error) { toast.error("رمز التحقق غير صحيح أو منتهي."); return; }
    toast.success("تم تأكيد بريدك الإلكتروني.");
    router.push("/account");
    router.refresh();
  }

  return <form onSubmit={verify} className="grid gap-6"><div className="rounded-xl bg-muted/50 p-4 text-center text-sm">أرسلنا رمزًا من 6 أرقام إلى <strong dir="ltr">{email}</strong></div><OtpInput value={token} onChange={setToken} disabled={busy} /><Button size="lg" disabled={busy || token.length !== 6}>{busy ? "جارٍ التحقق..." : "تأكيد البريد"}</Button><Link href="/register" className="text-center text-sm font-bold text-primary">استخدام بريد آخر</Link></form>;
}

export function RecoveryVerificationForm({ email }: { email: string }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  async function reset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token.length !== 6) { toast.error("أدخل رمز التحقق المكوّن من 6 أرقام."); return; }
    if (password.length < 8 || password !== confirmation) { toast.error("تحقق من كلمة المرور وتأكيدها."); return; }
    setBusy(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
    if (verifyError) { setBusy(false); toast.error("رمز الاستعادة غير صحيح أو منتهي."); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) { toast.error("تعذر تحديث كلمة المرور."); return; }
    toast.success("تم تحديث كلمة المرور.");
    router.push("/login");
  }

  return <form onSubmit={reset} className="grid gap-5"><div className="rounded-xl bg-muted/50 p-4 text-center text-sm">أرسلنا رمز الاستعادة إلى <strong dir="ltr">{email}</strong></div><OtpInput value={token} onChange={setToken} disabled={busy} /><div><Label htmlFor="reset-password">كلمة المرور الجديدة</Label><Input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required className="mt-2" /></div><div><Label htmlFor="reset-confirm-password">تأكيد كلمة المرور</Label><Input id="reset-confirm-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required className="mt-2" /></div><Button size="lg" disabled={busy || token.length !== 6}>{busy ? "جارٍ تحديث كلمة المرور..." : "تحديث كلمة المرور"}</Button></form>;
}
