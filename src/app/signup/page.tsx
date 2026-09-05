import { AuthShell } from "@/app/login/page";
import { RegisterForm } from "@/components/auth-forms";

export default function SignupPage() {
  return <AuthShell title="أنشئ حسابك" description="ابدأ مكتبتك الرقمية في دقائق."><RegisterForm /></AuthShell>;
}