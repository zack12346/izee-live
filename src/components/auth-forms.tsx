"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { forgotPasswordAction, loginAction, registerAction } from "@/services/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await loginAction(formData);
      if (!result?.ok) {
        const message = result?.error ?? "تعذر تسجيل الدخول.";
        console.error("Login failed:", message);
        toast.error(message);
        return;
      }
      toast.success("تم تسجيل الدخول بنجاح.");
      router.push(result.nextPath);
    } catch (error) {
      console.error("Login request failed:", error);
      toast.error("تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <Label htmlFor="login-email">البريد الإلكتروني</Label>
        <Input id="login-email" name="email" type="email" autoComplete="email" required className="mt-2" />
      </div>
      <div>
        <div className="flex justify-between">
          <Label htmlFor="login-password">كلمة المرور</Label>
          <Link href="/forgot-password" className="text-xs text-primary">نسيت كلمة المرور؟</Link>
        </div>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required className="mt-2" />
      </div>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">ليس لديك حساب؟ <Link href="/signup" className="font-bold text-primary">أنشئ حساباً</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await registerAction(formData);
      if (!result.ok) {
        console.error("Registration failed:", result.error);
        toast.error(result.error ?? "تعذر إنشاء الحساب.");
        return;
      }
      console.info("Registration succeeded.");
      toast.success(result.message);
      router.push(`/verify?email=${encodeURIComponent(String(formData.get("email")))}`);
    } catch (error) {
      console.error("Registration request failed:", error);
      toast.error("تعذر الاتصال بخدمة التسجيل. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div>
        <Label htmlFor="register-full-name">الاسم الكامل</Label>
        <Input id="register-full-name" name="fullName" autoComplete="name" required className="mt-2" />
      </div>
      <div>
        <Label htmlFor="register-email">البريد الإلكتروني</Label>
        <Input id="register-email" name="email" type="email" autoComplete="email" required className="mt-2" />
      </div>
      <div>
        <Label htmlFor="register-password">كلمة المرور</Label>
        <Input id="register-password" name="password" type="password" autoComplete="new-password" minLength={8} required className="mt-2" />
      </div>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">لديك حساب؟ <Link href="/login" className="font-bold text-primary">سجّل الدخول</Link></p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const result = await forgotPasswordAction(formData);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.push(`/reset-password?email=${encodeURIComponent(String(formData.get("email")))}`);
  }

  return <form onSubmit={handleSubmit} className="grid gap-5"><div><Label htmlFor="forgot-email">البريد الإلكتروني</Label><Input id="forgot-email" name="email" type="email" required className="mt-2" /></div><Button size="lg" disabled={busy}>{busy ? "جارٍ إرسال الرمز..." : "إرسال رمز الاستعادة"}</Button><Link href="/login" className="text-center text-sm font-bold text-primary">العودة لتسجيل الدخول</Link></form>;
}
