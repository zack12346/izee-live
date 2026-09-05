import { AuthShell } from "@/app/login/page";
import { SignupVerificationForm } from "@/components/otp-auth-forms";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const safeEmail = email ?? "";
  return <AuthShell title="تأكيد البريد الإلكتروني" description="أدخل الرمز المرسل إلى بريدك لإكمال إنشاء الحساب.">{safeEmail ? <SignupVerificationForm email={safeEmail} /> : <p className="text-center text-sm text-muted-foreground">افتح صفحة التسجيل أولًا لطلب رمز التحقق.</p>}</AuthShell>;
}
