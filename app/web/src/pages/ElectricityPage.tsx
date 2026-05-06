import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, X } from 'lucide-react';
import { getElectricityReport, type ElectricityRecord } from '../api/invoices';
import { listAllTenants } from '../api/tenants';

export function ElectricityPage() {
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState('');
  const [tenantId, setTenantId] = useState<number | undefined>(undefined);

  const tenantsQuery = useQuery({ queryKey: ['tenants-all'], queryFn: listAllTenants });

  const reportQuery = useQuery({
    queryKey: ['electricity', { page, month, tenantId }],
    queryFn: () => getElectricityReport({ page, month, tenantId }),
  });

  const data = reportQuery.data;
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Electricity Report</h1>
        <p className="text-sm text-steel">Track electricity usage, units consumed, and costs.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 text-amber-600">
            <Zap className="h-4 w-4" />
          </div>
          <p className="text-sm text-steel">Total Units</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{summary?.totalUnits ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-mint/10 text-mint">
            <Zap className="h-4 w-4" />
          </div>
          <p className="text-sm text-steel">Total Cost</p>
          <p className="mt-1 text-2xl font-semibold text-ink">₹{summary?.totalCost ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-steel">
            <Zap className="h-4 w-4" />
          </div>
          <p className="text-sm text-steel">Rate per Unit</p>
          <p className="mt-1 text-2xl font-semibold text-ink">₹{summary?.rate ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint"
          placeholder="Filter by month"
        />
        <select
          value={tenantId ?? ''}
          onChange={(e) => { setTenantId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint"
        >
          <option value="">All Tenants</option>
          {tenantsQuery.data?.data.map((t) => (
            <option key={t.id} value={t.id}>Room {t.roomNo} — {t.name}</option>
          ))}
        </select>
        {(month || tenantId) && (
          <button onClick={() => { setMonth(''); setTenantId(undefined); }} className="h-10 rounded-md border border-slate-300 px-3 text-sm text-steel hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-steel">
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Previous</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Cost</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((rec: ElectricityRecord) => (
              <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-ink">{rec.tenant.name}</td>
                <td className="px-4 py-3">{rec.tenant.roomNo}</td>
                <td className="px-4 py-3">{rec.month}</td>
                <td className="px-4 py-3">{rec.currentUnits}</td>
                <td className="px-4 py-3">{rec.previousUnits}</td>
                <td className="px-4 py-3 font-semibold">{rec.usedUnits}</td>
                <td className="px-4 py-3">₹{rec.rate}</td>
                <td className="px-4 py-3 font-semibold">₹{rec.cost}</td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-steel">No electricity records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-steel">
          <span>Page {data.page} of {data.totalPages} ({data.total} total)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-9 rounded-md border border-slate-300 px-3 disabled:opacity-50">Previous</button>
            <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="h-9 rounded-md border border-slate-300 px-3 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
