import Link from "next/link";
import { getDashboardSnapshot } from "@/application/dashboard/dashboard-engine";

const labels: Record<string,string> = {
  NEW:"جديد", PROCESSING:"قيد المعالجة", RECEIVED:"مستلم", IN_TRANSIT:"في الطريق",
  ARRIVED:"وصل", READY_FOR_PICKUP:"جاهز للتسليم", DELIVERED:"تم التسليم",
  CANCELLED:"ملغى", RETURNED:"مرتجع", ISSUE:"مشكلة"
};

export default async function Dashboard() {
  const m = await getDashboardSnapshot();
  const cards = [
    ["شحنات اليوم", m.today, "/dashboard/shipments"],
    ["قيد المعالجة", m.processing, "/dashboard/shipments?status=PROCESSING"],
    ["في الطريق", m.transit, "/dashboard/shipments?status=IN_TRANSIT"],
    ["جاهز للتسليم", m.ready, "/dashboard/shipments?status=READY_FOR_PICKUP"],
    ["تم التسليم اليوم", m.delivered, "/dashboard/shipments?status=DELIVERED"],
    ["مرتجعات اليوم", m.returned, "/dashboard/shipments?status=RETURNED"],
    ["عملاء نشطون", m.customers, "/dashboard/customers"],
  ];
  return <section className="p-5 md:p-8">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-sky-700">مركز العمليات</p><h1 className="mt-1 text-3xl font-black tracking-tight">لوحة التحكم</h1><p className="mt-2 text-slate-500">صورة تشغيلية مباشرة من قاعدة البيانات.</p></div>
      <Link href="/dashboard/shipments/new" className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white shadow-sm">+ تسجيل شحنة</Link>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map(([label,value,href]) => <Link href={String(href)} key={String(label)} className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-black">{value}</div><div className="mt-3 text-xs font-semibold text-sky-700">فتح التفاصيل ←</div>
      </Link>)}
    </div>
    <div className="mt-6 rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-black">آخر حركة للشحنات</h2><p className="mt-1 text-sm text-slate-500">آخر الشحنات التي تغيرت حالتها.</p></div><Link href="/dashboard/shipments" className="text-sm font-bold text-sky-700">كل الشحنات</Link></div>
      <div className="divide-y">{m.recent.length === 0 ? <p className="p-6 text-slate-500">لا توجد شحنات بعد.</p> : m.recent.map(row =>
        <Link href={"/dashboard/shipments?search="+encodeURIComponent(row.reference)} key={row.reference} className="grid gap-2 p-5 md:grid-cols-[1.2fr_1fr_1.5fr_auto] md:items-center hover:bg-slate-50">
          <div><b>{row.reference}</b><div className="text-xs text-slate-500">{row.senderName} ← {row.recipientName}</div></div>
          <div className="text-sm">{row.originWilaya} <span className="text-sky-600">→</span> {row.destinationWilaya}</div>
          <div className="text-sm text-slate-500">{new Intl.DateTimeFormat("ar-DZ",{dateStyle:"short",timeStyle:"short"}).format(row.updatedAt)}</div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-bold">{labels[row.status] ?? row.status}</span>
        </Link>)}</div>
    </div>
  </section>;
}
