"use client";

import { useEffect, useState } from "react";

type Summary = {
  cash: { balance: number; currency: string };
  outstandingDebt: number;
  todayIncoming: number;
};

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 }).format(value) + " " + currency;

export default function Finance() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/finance/summary", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("LOAD_FAILED");
        return response.json() as Promise<Summary>;
      })
      .then(setSummary)
      .catch(() => setError(true));
  }, []);

  if (error) return <section className="p-6 md:p-8"><h1 className="text-3xl font-bold">المالية</h1><p className="mt-4 text-red-600">تعذر تحميل البيانات المالية.</p></section>;
  if (!summary) return <section className="p-6 md:p-8"><h1 className="text-3xl font-bold">المالية</h1><p className="mt-4 text-slate-500">جاري تحميل البيانات...</p></section>;

  const cards = [
    ["الرصيد النقدي", money(summary.cash.balance, summary.cash.currency)],
    ["إيرادات اليوم", money(summary.todayIncoming, summary.cash.currency)],
    ["إجمالي الديون القائمة", money(summary.outstandingDebt, summary.cash.currency)],
  ];

  return <section className="p-6 md:p-8">
    <h1 className="text-3xl font-bold">المالية</h1>
    <p className="mt-2 text-slate-500">الخزينة، الإيرادات، الديون، المدفوعات والتسويات.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {cards.map(([label, value]) => <div key={label} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}
    </div>
  </section>;
}
