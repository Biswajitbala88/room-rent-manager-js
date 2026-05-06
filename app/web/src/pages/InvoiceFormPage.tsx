import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { listAllTenants, type Tenant } from '../api/tenants';
import { getInvoice, createInvoice, updateInvoice, getLastUnits } from '../api/invoices';
import { DEFAULT_ELECTRIC_RATE } from '@room-rent/shared';

export function InvoiceFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({ queryKey: ['tenants-all'], queryFn: listAllTenants });
  const invoiceQuery = useQuery({
    queryKey: ['invoice', Number(id)],
    queryFn: () => getInvoice(Number(id)),
    enabled: isEdit,
  });

  const [tenantId, setTenantId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [electricityUnits, setElectricityUnits] = useState('0');
  const [lastUnits, setLastUnits] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [closer, setCloser] = useState(false);
  const [isExcluded, setIsExcluded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTenant: Tenant | undefined = tenantsQuery.data?.data.find((t) => t.id === Number(tenantId));

  // Electricity calc
  const currentUnits = Number(electricityUnits) || 0;
  const consumedUnits = Math.max(currentUnits - lastUnits, 0);
  const rate = DEFAULT_ELECTRIC_RATE;
  const tenantStartMonth = selectedTenant?.startDate?.slice(0, 7) ?? '';
  const isFirstMonth = month === tenantStartMonth;
  const electricityCharge = isFirstMonth ? 0 : consumedUnits * rate;
  const waterCharge = isFirstMonth ? 0 : selectedTenant?.isWaterCharge ? Number(selectedTenant.waterCharge) : 0;
  const rentAmount = closer && selectedTenant?.isAdvanced ? 0 : Number(selectedTenant?.rentAmount ?? 0);
  const totalAmount = rentAmount + electricityCharge + waterCharge;

  // Fetch last units when tenant/month changes
  const fetchLastUnits = useCallback(async () => {
    if (tenantId && month) {
      try {
        const result = await getLastUnits(Number(tenantId), month);
        setLastUnits(result.lastUnits);
      } catch { setLastUnits(0); }
    }
  }, [tenantId, month]);

  useEffect(() => { fetchLastUnits(); }, [fetchLastUnits]);

  // Load edit data
  useEffect(() => {
    if (invoiceQuery.data) {
      const inv = invoiceQuery.data.data;
      setTenantId(String(inv.tenantId));
      setMonth(inv.month);
      setElectricityUnits(String(Number(inv.electricityUnits)));
      setReceivedAmount(String(Number(inv.receivedAmount)));
      setIsExcluded(inv.isExcluded);
      if (inv.previousUnits !== undefined) setLastUnits(inv.previousUnits);
    }
  }, [invoiceQuery.data]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createInvoice(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); navigate('/invoices'); },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateInvoice(Number(id), data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); navigate('/invoices'); },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isEdit) {
      updateMutation.mutate({
        electricityUnits: currentUnits,
        receivedAmount: Number(receivedAmount),
        paymentMode,
        paymentDate,
        isExcluded,
      });
    } else {
      createMutation.mutate({
        tenantId: Number(tenantId),
        month,
        electricityUnits: currentUnits,
        receivedAmount: Number(receivedAmount),
        paymentMode,
        paymentDate,
        closer,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="rounded p-1.5 text-steel hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h1>
          <p className="text-sm text-steel">{isEdit ? 'Modify invoice details and payments.' : 'Generate a new rent invoice.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6">
        {/* Tenant + Month */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Tenant</span>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
              disabled={isEdit}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint disabled:bg-slate-100"
            >
              <option value="">Select tenant...</option>
              {tenantsQuery.data?.data.filter((t) => t.status === 'active').map((t) => (
                <option key={t.id} value={t.id}>Room {t.roomNo} — {t.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Month</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required disabled={isEdit} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint disabled:bg-slate-100" />
          </label>
        </div>

        {/* Tenant info display */}
        {selectedTenant && (
          <div className="rounded-md bg-slate-50 p-3 text-sm text-steel">
            Rent: ₹{Number(selectedTenant.rentAmount)} | Water: {selectedTenant.isWaterCharge ? `₹${Number(selectedTenant.waterCharge)}` : 'No'} | Advanced: {selectedTenant.isAdvanced ? 'Yes' : 'No'} | Start: {selectedTenant.startDate?.slice(0, 7)}
            {isFirstMonth && <span className="ml-2 text-xs font-semibold text-amber-600">(First month — electricity & water = ₹0)</span>}
          </div>
        )}

        {/* Electricity */}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">Current Meter Reading</span>
            <input type="number" value={electricityUnits} onChange={(e) => setElectricityUnits(e.target.value)} min="0" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint" />
          </label>
          <div>
            <span className="text-sm font-medium text-ink">Last Reading</span>
            <p className="mt-1 h-10 flex items-center px-3 rounded-md bg-slate-50 text-sm text-steel">{lastUnits}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-ink">Consumed × ₹{rate}</span>
            <p className="mt-1 h-10 flex items-center px-3 rounded-md bg-slate-50 text-sm font-semibold text-ink">
              {consumedUnits} units = ₹{electricityCharge}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-md border border-slate-200 p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-steel">Rent</span><span>₹{rentAmount}</span></div>
          <div className="flex justify-between"><span className="text-steel">Electricity</span><span>₹{electricityCharge}</span></div>
          <div className="flex justify-between"><span className="text-steel">Water</span><span>₹{waterCharge}</span></div>
          <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>₹{totalAmount}</span></div>
        </div>

        {/* Payment */}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">Received (₹)</span>
            <input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} min="0" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Payment Mode</span>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint">
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Payment Date</span>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint" />
          </label>
        </div>

        {/* Closer + Exclude */}
        <div className="flex flex-wrap gap-6">
          {!isEdit && (
            <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <input type="checkbox" checked={closer} onChange={(e) => setCloser(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-coral focus:ring-coral" />
              Close / Checkout Tenant
            </label>
          )}
          {isEdit && (
            <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <input type="checkbox" checked={isExcluded} onChange={(e) => setIsExcluded(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-mint focus:ring-mint" />
              Exclude from dues
            </label>
          )}
        </div>

        {error && <div className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/invoices')} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-steel hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={isPending} className="h-10 rounded-md bg-mint px-6 text-sm font-semibold text-white hover:bg-mint/90 disabled:opacity-70">
            {isPending ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
