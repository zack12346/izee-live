"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations";
import { SITE_URL } from "@/lib/constants";

function nextPath(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/account";
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false as const, error: "البريد أو كلمة المرور غير صحيحة." };
    return { ok: true as const, nextPath: nextPath(formData.get("next")) };
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${SITE_URL}/verify`,
    },
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, message: "تم إنشاء الحساب. أدخل رمز التحقق المرسل إلى بريدك الإلكتروني." };
}

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "بريد غير صالح" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/reset-password`,
  });
  if (error) return { ok: false as const, error: "تعذر إرسال رابط الاستعادة." };
  return { ok: true as const, message: "إن كان البريد مسجلاً فستصلك رسالة لإعادة تعيين كلمة المرور." };
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false as const, error: "تعذر تحديث كلمة المرور. افتح الرابط من البريد مجدداً." };
    return { ok: true as const };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
