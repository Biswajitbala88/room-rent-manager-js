import { useQuery } from '@tanstack/react-query';
import { CalendarDays, IndianRupee, ReceiptText, Zap, type LucideIcon } from 'lucide-react';
import { apiFetch } from '../api/client';

type DashboardSummary = {
  month: string;
  pendingInvoices: number;
  dueAmount: number;
  receivedAmount: number;
  electricityUnits: number;
  electricityCost: number;
  electricRate: number;
};

export function DashboardPage() {
  const month = new Date().toISOString().slice(0, 7);
  const summaryQuery = useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => apiFetch<DashboardSummary>(`/dashboard?month=${month}`),
  });
  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-steel">Month summary and due payment workflow.</p>
        </div>
        <div className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-steel">
          <CalendarDays className="h-4 w-4" />
          {month}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ReceiptText} label="Pending invoices" value={summary?.pendingInvoices ?? 0} />
        <SummaryCard icon={IndianRupee} label="Due amount" value={formatCurrency(summary?.dueAmount ?? 0)} />
        <SummaryCard icon={IndianRupee} label="Received amount" value={formatCurrency(summary?.receivedAmount ?? 0)} />
        <SummaryCard icon={Zap} label="Electricity cost" value={formatCurrency(summary?.electricityCost ?? 0)} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-ink">Due payments</h2>
        </div>
        <div className="px-4 py-10 text-center text-sm text-steel">
          Tenant, invoice, and payment flows are next in the roadmap. The authenticated shell is ready for them.
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-mint/10 text-mint">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm text-steel">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}
