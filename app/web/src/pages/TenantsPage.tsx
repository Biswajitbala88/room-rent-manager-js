import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Pencil, History, X } from 'lucide-react';
import { listTenants, deleteTenant, getTenantTransactions, type Tenant, type Transaction } from '../api/tenants';
import { useAuth } from '../context/AuthContext';

export function TenantsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [txTenant, setTxTenant] = useState<Tenant | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ['tenants', { page, search, status }],
    queryFn: () => listTenants({ page, search, status }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  function handleDelete(id: number, name: string) {
    if (confirm(`Delete tenant "${name}" and all related data?`)) {
      deleteMutation.mutate(id);
    }
  }

  const data = tenantsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tenants</h1>
          <p className="text-sm text-steel">Manage tenants, rooms, and Aadhaar records.</p>
        </div>
        <Link
          to="/tenants/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-white hover:bg-mint/90"
        >
          <Plus className="h-4 w-4" /> Add Tenant
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
          <input
            type="text"
            placeholder="Search name, phone, room..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="close">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-steel">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Rent</th>
              <th className="px-4 py-3">Status</th>
              {user?.userType === 'SA' && <th className="px-4 py-3">Owner</th>}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                <td className="px-4 py-3">{t.roomNo}</td>
                <td className="px-4 py-3">{t.phone}</td>
                <td className="px-4 py-3">₹{Number(t.rentAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {t.status}
                  </span>
                </td>
                {user?.userType === 'SA' && <td className="px-4 py-3 text-steel">{t.owner?.name ?? '—'}</td>}
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => setTxTenant(t)} title="Transactions" className="rounded p-1.5 text-steel hover:bg-slate-100 hover:text-ink"><History className="h-4 w-4" /></button>
                    <Link to={`/tenants/${t.id}/edit`} title="Edit" className="rounded p-1.5 text-steel hover:bg-slate-100 hover:text-ink"><Pencil className="h-4 w-4" /></Link>
                    <button onClick={() => handleDelete(t.id, t.name)} title="Delete" className="rounded p-1.5 text-steel hover:bg-red-50 hover:text-coral"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr><td colSpan={user?.userType === 'SA' ? 7 : 6} className="px-4 py-10 text-center text-steel">No tenants found.</td></tr>
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

      {/* Transaction History Modal */}
      {txTenant && <TransactionModal tenant={txTenant} onClose={() => setTxTenant(null)} />}
    </div>
  );
}

function TransactionModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const txQuery = useQuery({
    queryKey: ['tenant-transactions', tenant.id],
    queryFn: () => getTenantTransactions(tenant.id),
  });
  const transactions = txQuery.data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-ink">Transactions — {tenant.name} (Room {tenant.roomNo})</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-steel">No transactions found.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-steel">
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Mode</th>
                  <th className="px-4 py-2">Payment Date</th>
                  <th className="px-4 py-2">Invoice Month</th>
                  <th className="px-4 py-2">Logged</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: Transaction) => (
                  <tr key={tx.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-medium">₹{Number(tx.amount)}</td>
                    <td className="px-4 py-2">{tx.paymentMode}</td>
                    <td className="px-4 py-2">{new Date(tx.paymentDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2">{tx.invoice?.month ?? '—'}</td>
                    <td className="px-4 py-2 text-steel">{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
