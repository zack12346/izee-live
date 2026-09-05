import { AuthShell } from "@/app/login/page";
import { RecoveryVerificationForm } from "@/components/otp-auth-forms";

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <AuthShell title="استعادة كلمة المرور" description="أدخل رمز الاستعادة ثم اختر كلمة مرور جديدة.">{email ? <RecoveryVerificationForm email={email} /> : <p className="text-center text-sm text-muted-foreground">اطلب رمز الاستعادة من صفحة نسيت كلمة المرور.</p>}</AuthShell>;
}
