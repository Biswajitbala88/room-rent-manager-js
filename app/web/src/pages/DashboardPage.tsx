import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, IndianRupee, ReceiptText, Zap, FileDown, type LucideIcon } from 'lucide-react';
import { apiFetch } from '../api/client';
import { getDueTenants, getDueInvoices, addPayment, getInvoicePdfUrl, type DueTenant, type DueInvoice } from '../api/invoices';

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
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => apiFetch<DashboardSummary>(`/dashboard?month=${month}`),
  });

  const dueTenants = useQuery({
    queryKey: ['due-tenants'],
    queryFn: getDueTenants,
  });

  const dueInvoices = useQuery({
    queryKey: ['due-invoices', selectedTenantId],
    queryFn: () => getDueInvoices(selectedTenantId!),
    enabled: selectedTenantId !== null,
  });

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-steel">Month summary and due payment workflow.</p>
        </div>
        <div className="inline-flex h-10 items-center gap-2">
          <CalendarDays className="h-4 w-4 text-steel" />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ReceiptText} label="Pending invoices" value={summary?.pendingInvoices ?? 0} />
        <SummaryCard icon={IndianRupee} label="Due amount" value={formatCurrency(summary?.dueAmount ?? 0)} />
        <SummaryCard icon={IndianRupee} label="Received amount" value={formatCurrency(summary?.receivedAmount ?? 0)} />
        <SummaryCard icon={Zap} label="Electricity cost" value={formatCurrency(summary?.electricityCost ?? 0)} />
      </div>

      {/* Due payments section */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Due Payments</h2>
          <select
            value={selectedTenantId ?? ''}
            onChange={(e) => setSelectedTenantId(e.target.value ? Number(e.target.value) : null)}
            className="h-9 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint"
          >
            <option value="">Select tenant with dues...</option>
            {dueTenants.data?.data.map((t: DueTenant) => (
              <option key={t.id} value={t.id}>
                Room {t.roomNo} — {t.name} ({t.dueInvoiceCount} invoices, ₹{t.totalDue} due)
              </option>
            ))}
          </select>
        </div>

        {selectedTenantId && dueInvoices.data ? (
          <div className="divide-y divide-slate-100">
            {dueInvoices.data.data.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-steel">No due invoices for this tenant.</p>
            ) : (
              dueInvoices.data.data.map((inv: DueInvoice) => (
                <DueInvoiceRow key={inv.id} invoice={inv} queryClient={queryClient} />
              ))
            )}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-steel">
            {dueTenants.data?.data.length === 0 ? 'No tenants with pending dues.' : 'Select a tenant to view and collect due payments.'}
          </div>
        )}
      </section>
    </div>
  );
}

function DueInvoiceRow({ invoice, queryClient }: { invoice: DueInvoice; queryClient: ReturnType<typeof useQueryClient> }) {
  const [amount, setAmount] = useState(String(invoice.dueAmount));
  const [mode, setMode] = useState('Cash');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const paymentMutation = useMutation({
    mutationFn: () => addPayment(invoice.id, { amount: Number(amount), paymentMode: mode, paymentDate: date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['due-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['due-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-[120px]">
        <p className="text-sm font-medium text-ink">{invoice.month}</p>
        <p className="text-xs text-steel">Total: ₹{invoice.totalAmount} | Due: ₹{invoice.dueAmount}</p>
      </div>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" className="h-9 w-24 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-mint" placeholder="Amount" />
      <select value={mode} onChange={(e) => setMode(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-mint">
        <option>Cash</option>
        <option>UPI</option>
        <option>Bank Transfer</option>
      </select>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-mint" />
      <button
        onClick={() => paymentMutation.mutate()}
        disabled={paymentMutation.isPending || Number(amount) <= 0}
        className="h-9 rounded-md bg-mint px-4 text-sm font-semibold text-white hover:bg-mint/90 disabled:opacity-50"
      >
        {paymentMutation.isPending ? '...' : 'Save'}
      </button>
      <a href={getInvoicePdfUrl(invoice.id)} target="_blank" rel="noreferrer" className="rounded p-1.5 text-steel hover:bg-slate-100 hover:text-ink">
        <FileDown className="h-4 w-4" />
      </a>
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
