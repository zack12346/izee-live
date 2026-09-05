"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
import { getAdminReceiptUrl, reviewManualPayment } from "@/services/admin";
import { Button } from "@/components/ui/button";

type AdminOrder = {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total: number;
  created_at: string;
  profiles?: { email?: string; full_name?: string | null } | Array<{ email?: string; full_name?: string | null }> | null;
  items?: Array<{ name: string; quantity: number }>;
  payments?: Array<{ transaction_reference?: string | null; reference?: string | null; receipt_path?: string | null; status: string }>;
};

const paymentLabels: Record<string, string> = { baridimob: "بريدي موب", ccp: "CCP", flexy: "فليكسي", manual: "تحويل يدوي", test: "تجريبي" };

export function AdminOrderManagement({ orders }: { orders: AdminOrder[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  async function review(orderId: string, decision: "approve" | "reject") {
    setBusyId(orderId);
    const result = await reviewManualPayment(orderId, decision);
    setBusyId(null);
    if (!result.ok) { toast.error(result.error); return; }
    toast.success(decision === "approve" ? "تم قبول الدفع." : "تم رفض الدفع.");
    window.location.reload();
  }

  async function openReceipt(orderId: string) {
    const url = await getAdminReceiptUrl(orderId);
    if (!url) { toast.error("لا يوجد وصل متاح لهذا الطلب."); return; }
    setReceiptUrl(url);
  }

  return <>
    <div className="overflow-x-auto rounded-2xl border bg-card"><table className="w-full min-w-[900px] text-right text-sm"><thead className="border-b bg-muted/40"><tr><th className="p-4">الطلب</th><th className="p-4">العميل</th><th className="p-4">المنتج</th><th className="p-4">المبلغ</th><th className="p-4">الدفع</th><th className="p-4">المرجع</th><th className="p-4">الإجراء</th></tr></thead><tbody>{orders.map((order) => { const payment = order.payments?.[0]; const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles; const underReview = order.payment_status === "under_review" || payment?.status === "under_review"; return <tr key={order.id} className="border-b last:border-0"><td className="p-4 font-bold">{order.order_number ?? order.id.slice(0, 8)}</td><td className="p-4"><span className="block">{profile?.full_name ?? "عميل"}</span><span className="text-xs text-muted-foreground">{profile?.email}</span></td><td className="p-4">{order.items?.map((item) => `${item.name} × ${item.quantity}`).join("، ")}</td><td className="p-4 font-bold">{Number(order.total).toLocaleString("ar-DZ")} دج</td><td className="p-4"><span className="block">{paymentLabels[order.payment_method ?? ""] ?? order.payment_method ?? "-"}</span><span className="text-xs text-amber-600">{order.payment_status}</span></td><td className="p-4 font-mono">{payment?.transaction_reference ?? payment?.reference ?? "-"}</td><td className="p-4"><div className="flex flex-wrap gap-2">{payment?.receipt_path ? <Button size="sm" variant="outline" onClick={() => openReceipt(order.id)}><Eye /> الوصل</Button> : null}{underReview ? <><Button size="sm" onClick={() => review(order.id, "approve")} disabled={busyId === order.id}>قبول الدفع</Button><Button size="sm" variant="destructive" onClick={() => review(order.id, "reject")} disabled={busyId === order.id}>رفض</Button></> : null}</div></td></tr>; })}</tbody></table>{!orders.length ? <p className="p-12 text-center text-muted-foreground">لا توجد طلبات للدفع.</p> : null}</div>
    {receiptUrl ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true"><div className="relative max-h-[90vh] max-w-3xl rounded-2xl bg-card p-4"><Button variant="ghost" size="icon" className="absolute -right-2 -top-2" onClick={() => setReceiptUrl(null)} aria-label="إغلاق"><X /></Button><img src={receiptUrl} alt="وصل الدفع" className="max-h-[80vh] max-w-full object-contain" /></div></div> : null}
  </>;
}
