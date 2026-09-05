import { AuthShell } from "@/app/login/page";
import { ForgotPasswordForm } from "@/components/auth-forms";

export default function ForgotPassword() {
  return <AuthShell title="استعادة كلمة المرور" description="سنرسل رمزًا من 6 أرقام إلى بريدك الإلكتروني."><ForgotPasswordForm /></AuthShell>;
}
