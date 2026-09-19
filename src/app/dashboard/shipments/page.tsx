"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ShipmentRow = {
  id: string; reference: string; senderName: string; recipientName: string;
  originWilaya: string; destinationWilaya: string; quantity: number;
  deliveryFee: string; status: string; financialStatus: string; createdAt: string;
};
type ShipmentResponse = {
  items: ShipmentRow[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
};
const statusLabels: Record<string, string> = {
  NEW: "جديد", PROCESSING: "قيد المعالجة", RECEIVED: "مستلم",
  IN_TRANSIT: "في الطريق", ARRIVED: "وصل", READY_FOR_PICKUP: "جاهز للاستلام",
  DELIVERED: "تم التسليم", CANCELLED: "ملغى", RETURNED: "مرتجع", ISSUE: "مشكلة",
};

export default function Shipments() {
  const [data, setData] = useState<ShipmentResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/shipments?search=" + encodeURIComponent(search), { signal: controller.signal });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "تعذر تحميل الطرود");
        setData(json); setError("");
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "تعذر تحميل الطرود");
      } finally { setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);

  return <section className="p-6 md:p-8">
    <div className="flex flex-wrap justify-between gap-3">
      <div><h1 className="text-3xl font-bold">الطرود</h1><p className="mt-1 text-slate-500">بحث سريع من قاعدة البيانات مع ترقيم صفحات.</p></div>
      <Link href="/dashboard/shipments/new" className="rounded-xl bg-teal-600 px-4 py-3 text-white">+ طرد جديد</Link>
    </div>
    <div className="mt-6 rounded-2xl border bg-white p-4">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالمرجع أو المرسل أو المستلم..." className="w-full rounded-xl border p-3" aria-label="البحث في الطرود" />
    </div>
    <div className="mt-4 overflow-x-auto rounded-2xl border bg-white">
      {loading && <p className="p-6 text-slate-500">جاري التحميل...</p>}
      {!loading && error && <p className="p-6 text-red-700">{error}</p>}
      {!loading && !error && data?.items.length === 0 && <p className="p-6 text-slate-500">لا توجد طرود مطابقة.</p>}
      {!loading && !error && data && data.items.length > 0 && <table className="w-full text-right text-sm">
        <thead className="border-b bg-slate-50"><tr><th className="p-4">المرجع</th><th className="p-4">المرسل</th><th className="p-4">المستلم</th><th className="p-4">المسار</th><th className="p-4">الحالة</th><th className="p-4">الرسوم</th></tr></thead>
        <tbody>{data.items.map((row) => <tr key={row.id} className="border-b last:border-0">
          <td className="p-4 font-semibold">{row.reference}</td><td className="p-4">{row.senderName}</td><td className="p-4">{row.recipientName}</td>
          <td className="p-4">{row.originWilaya} → {row.destinationWilaya}</td><td className="p-4">{statusLabels[row.status] ?? row.status}</td>
          <td className="p-4">{Number(row.deliveryFee).toLocaleString("ar-DZ")} دج</td>
        </tr>)}</tbody>
      </table>}
    </div>
    {data && <p className="mt-3 text-sm text-slate-500">الصفحة {data.pagination.page} من {Math.max(1, data.pagination.pages)} — إجمالي {data.pagination.total}</p>}
  </section>;
}
