import { CURRENCY_LABEL } from "@/lib/constants";

export function formatPrice(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  return `${new Intl.NumberFormat("ar-DZ", {
    maximumFractionDigits: 0,
  }).format(value)} ${CURRENCY_LABEL}`;
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function accountTypeLabel(value: string | null | undefined) {
  return value === "full_private_account" ? "حساب كامل" : "شاشة مشتركة";
}

export function durationLabel(value: number | null | undefined, unit: string | null | undefined) {
  if (!value || !unit) return null;
  const labels: Record<string, string> = { day: value === 1 ? "يوم" : "أيام", month: value === 1 ? "شهر" : "أشهر", year: value === 1 ? "سنة" : "سنوات" };
  return `${value} ${labels[unit] ?? unit}`;
}

export function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const units = ["بايت", "ك.ب", "م.ب", "ج.ب"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function discountPercent(price: number, comparePrice: number | null) {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fileTypeLabel(type: string) {
  const map: Record<string, string> = {
    pdf: "PDF",
    epub: "كتاب إلكتروني",
    xlsx: "Excel",
    docx: "Word",
    pptx: "PowerPoint",
    zip: "ZIP",
    image: "صورة",
    video: "فيديو",
    software: "برنامج",
    other: "ملف رقمي",
  };
  return map[type] ?? type;
}
