import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Pencil, FileDown, X } from 'lucide-react';
import { listInvoices, deleteInvoice, getInvoicePdfUrl, type Invoice } from '../api/invoices';
import { useAuth } from '../context/AuthContext';

export function InvoicesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');

  const invoicesQuery = useQuery({
    queryKey: ['invoices', { page, search, month }],
    queryFn: () => listInvoices({ page, search, month }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  function handleDelete(id: number) {
    if (confirm('Delete this invoice and all related transactions?')) {
      deleteMutation.mutate(id);
    }
  }

  const data = invoicesQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
          <p className="text-sm text-steel">Manage rent invoices, electricity, and payments.</p>
        </div>
        <Link
          to="/invoices/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white hover:bg-mint/90"
        >
          <Plus className="h-4 w-4" /> Create Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
          <input
            type="text"
            placeholder="Search tenant name or room..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
          />
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint"
        />
        {month && (
          <button onClick={() => setMonth('')} className="h-10 rounded-md border border-slate-300 px-3 text-sm text-steel hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-steel">
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Consumed</th>
              <th className="px-4 py-3">Elec. ₹</th>
              <th className="px-4 py-3">Water ₹</th>
              <th className="px-4 py-3">Total ₹</th>
              <th className="px-4 py-3">Received ₹</th>
              <th className="px-4 py-3">Status</th>
              {user?.userType === 'SA' && <th className="px-4 py-3">Owner</th>}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((inv: Invoice) => {
              const due = (inv.dueAmount ?? Number(inv.totalAmount) - Number(inv.receivedAmount));
              const isPaid = due <= 0;
              return (
                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{inv.tenant?.roomNo ?? inv.roomNo}</td>
                  <td className="px-4 py-3 font-medium text-ink">{inv.tenant?.name ?? '—'}</td>
                  <td className="px-4 py-3">{inv.month}</td>
                  <td className="px-4 py-3">{Number(inv.electricityUnits)}</td>
                  <td className="px-4 py-3">{inv.consumedUnits ?? '—'}</td>
                  <td className="px-4 py-3">₹{Number(inv.electricityCharge)}</td>
                  <td className="px-4 py-3">₹{Number(inv.waterCharge)}</td>
                  <td className="px-4 py-3 font-semibold">₹{Number(inv.totalAmount)}</td>
                  <td className="px-4 py-3">₹{Number(inv.receivedAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isPaid ? 'Paid' : `Due ₹${due}`}
                    </span>
                    {inv.isExcluded && <span className="ml-1 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Excluded</span>}
                  </td>
                  {user?.userType === 'SA' && <td className="px-4 py-3 text-steel">{inv.tenant?.owner?.name ?? '—'}</td>}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <a href={getInvoicePdfUrl(inv.id)} target="_blank" rel="noreferrer" title="Download PDF" className="rounded p-1.5 text-steel hover:bg-slate-100 hover:text-ink"><FileDown className="h-4 w-4" /></a>
                      <Link to={`/invoices/${inv.id}/edit`} title="Edit" className="rounded p-1.5 text-steel hover:bg-slate-100 hover:text-ink"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => handleDelete(inv.id)} title="Delete" className="rounded p-1.5 text-steel hover:bg-red-50 hover:text-coral"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data?.data.length === 0 && (
              <tr><td colSpan={user?.userType === 'SA' ? 12 : 11} className="px-4 py-10 text-center text-steel">No invoices found.</td></tr>
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
