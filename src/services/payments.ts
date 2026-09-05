import type { PaymentProvider, PaymentStatus } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentSettings = {
  baridimob_number: string;
  ccp_number: string;
  account_holder: string;
  baridimob_instructions: string;
  ccp_instructions: string;
  flexy_phone: string;
  flexy_instructions: string;
  baridimob_enabled: boolean;
  ccp_enabled: boolean;
  flexy_enabled: boolean;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  baridimob_number: "",
  ccp_number: "",
  account_holder: "",
  baridimob_instructions: "أرسل المبلغ ثم ارفع وصل الدفع ورقم العملية.",
  ccp_instructions: "أرسل المبلغ ثم ارفع وصل الدفع ورقم العملية.",
  flexy_phone: "",
  flexy_instructions: "أرسل Flexy إلى الرقم المحدد ثم أدخل رقم العملية.",
  baridimob_enabled: true,
  ccp_enabled: true,
  flexy_enabled: true,
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("site_settings").select("value").eq("key", "payments").maybeSingle();
    return { ...DEFAULT_PAYMENT_SETTINGS, ...((data?.value ?? {}) as Partial<PaymentSettings>) };
  } catch {
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

export type PaymentIntentInput = {
  orderId: string;
  amount: number;
  currency: string;
  reference?: string;
  notes?: string;
};

export type PaymentIntentResult = {
  status: PaymentStatus;
  reference: string;
  message: string;
};

export interface PaymentGateway {
  id: PaymentProvider;
  label: string;
  description: string;
  enabled: boolean;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
}

class TestGateway implements PaymentGateway {
  id = "test" as const;
  label = "دفع تجريبي";
  description = "لتجربة المنصة محلياً. يؤكد الطلب فوراً دون أموال حقيقية.";
  enabled = process.env.ALLOW_TEST_PAYMENTS === "true";

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      status: "confirmed",
      reference: `TEST-${input.orderId.slice(0, 8).toUpperCase()}`,
      message: "تم تأكيد الدفع التجريبي.",
    };
  }
}

class ManualGateway implements PaymentGateway {
  id = "manual" as const;
  label = "تحويل يدوي";
  description = "CCP أو بريدي موب أو تحويل بنكي. يبقى الطلب معلقاً حتى تؤكد الإدارة الدفع.";
  enabled = true;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      status: "pending",
      reference: input.reference?.trim() || `MAN-${input.orderId.slice(0, 8).toUpperCase()}`,
      message: "استلمنا طلبك. سيتم تفعيل التحميل بعد مراجعة التحويل.",
    };
  }
}

class ManualProviderGateway implements PaymentGateway {
  constructor(public id: "baridimob" | "ccp" | "flexy", public label: string, public description: string) {}
  enabled = true;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      status: "under_review",
      reference: input.reference?.trim() || `MAN-${input.orderId.slice(0, 8).toUpperCase()}`,
      message: "تم استلام الطلب وسيتم التحقق من الدفع يدويًا.",
    };
  }
}

class PlaceholderGateway implements PaymentGateway {
  constructor(
    public id: PaymentProvider,
    public label: string,
    public description: string,
  ) {}
  enabled = false;

  async createIntent(): Promise<PaymentIntentResult> {
    throw new Error(`بوابة ${this.label} غير مفعّلة بعد. أضف مفاتيحها في الخادم عند توفر العقد الرسمي.`);
  }
}

const gateways: PaymentGateway[] = [
  new TestGateway(),
  new ManualGateway(),
  new ManualProviderGateway("baridimob", "بريدي موب", "تحويل بريدي موب مع رفع وصل الدفع."),
  new ManualProviderGateway("ccp", "CCP", "تحويل CCP مع رفع وصل الدفع."),
  new ManualProviderGateway("flexy", "فليكسي", "تحويل فليكسي مع تحقق يدوي."),
  new PlaceholderGateway("cib", "CIB", "بطاقة الذهبية / CIB عبر بوابة معتمدة عند توفر العقد."),
  new PlaceholderGateway("edahabia", "Edahabia", "بطاقة الذهبية عبر تكامل رسمي لاحق."),
  new PlaceholderGateway("baridimob", "BaridiMob", "دفع بريدي موب عند توفر واجهة معتمدة."),
  new PlaceholderGateway("ccp", "CCP", "تحويل CCP يدوي حالياً عبر خيار التحويل اليدوي."),
];

export function listEnabledGateways() {
  return gateways.filter((gateway) => gateway.enabled);
}

export function getGateway(id: PaymentProvider) {
  const gateway = gateways.find((item) => item.id === id);
  if (!gateway) {
    throw new Error("بوابة الدفع غير معروفة.");
  }
  if (!gateway.enabled) {
    throw new Error("بوابة الدفع غير مفعّلة.");
  }
  return gateway;
}
