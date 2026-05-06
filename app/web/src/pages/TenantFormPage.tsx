import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getTenant, createTenant, updateTenant } from '../api/tenants';

export function TenantFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tenantQuery = useQuery({
    queryKey: ['tenant', Number(id)],
    queryFn: () => getTenant(Number(id)),
    enabled: isEdit,
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [isWaterCharge, setIsWaterCharge] = useState(false);
  const [waterCharge, setWaterCharge] = useState('0');
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantQuery.data) {
      const t = tenantQuery.data.data;
      setName(t.name);
      setPhone(t.phone);
      setRoomNo(t.roomNo);
      setStartDate(t.startDate.slice(0, 10));
      setRentAmount(String(Number(t.rentAmount)));
      setIsWaterCharge(t.isWaterCharge);
      setWaterCharge(String(Number(t.waterCharge)));
      setIsAdvanced(t.isAdvanced);
      if (t.aadhaarImage) {
        try { setExistingImages(JSON.parse(t.aadhaarImage)); } catch { setExistingImages([]); }
      }
    }
  }, [tenantQuery.data]);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => (isEdit ? updateTenant(Number(id), formData) : createTenant(formData)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      navigate('/tenants');
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.append('name', name);
    fd.append('phone', phone);
    fd.append('roomNo', roomNo);
    fd.append('startDate', startDate);
    fd.append('rentAmount', rentAmount);
    fd.append('isWaterCharge', String(isWaterCharge));
    fd.append('waterCharge', isWaterCharge ? waterCharge : '0');
    fd.append('isAdvanced', String(isAdvanced));

    if (files) {
      for (let i = 0; i < files.length; i++) {
        fd.append('aadhaarImages', files[i]);
      }
    }

    mutation.mutate(fd);
  }

  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tenants')} className="rounded p-1.5 text-steel hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-semibold text-ink">{isEdit ? 'Edit Tenant' : 'Add Tenant'}</h1>
          <p className="text-sm text-steel">{isEdit ? 'Update tenant details.' : 'Register a new tenant with room assignment.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-ink">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-ink">Room No</span>
            <input value={roomNo} onChange={(e) => setRoomNo(e.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Start Date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Rent Amount (₹)</span>
            <input type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required min="0" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20" />
          </label>
        </div>

        {/* Water Charge Toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
            <input type="checkbox" checked={isWaterCharge} onChange={(e) => setIsWaterCharge(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-mint focus:ring-mint" />
            Water Charge
          </label>
          {isWaterCharge && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-steel">Amount (₹):</span>
              <input type="number" value={waterCharge} onChange={(e) => setWaterCharge(e.target.value)} min="0" className="h-9 w-24 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-mint" />
            </label>
          )}
        </div>

        {/* Advanced Paid Toggle */}
        <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
          <input type="checkbox" checked={isAdvanced} onChange={(e) => setIsAdvanced(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-mint focus:ring-mint" />
          Advance Paid (last month rent = ₹0)
        </label>

        {/* Aadhaar Upload */}
        <div>
          <span className="text-sm font-medium text-ink">Aadhaar Images</span>
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} className="mt-1 block w-full text-sm text-steel file:mr-3 file:rounded-md file:border-0 file:bg-mint/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-mint hover:file:bg-mint/20" />
          {existingImages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {existingImages.map((img, i) => (
                <img key={i} src={`${API_URL}${img}`} alt={`Aadhaar ${i + 1}`} className="h-20 w-20 rounded-md border object-cover" />
              ))}
            </div>
          )}
        </div>

        {error && <div className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/tenants')} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-steel hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="h-10 rounded-md bg-mint px-6 text-sm font-semibold text-white hover:bg-mint/90 disabled:opacity-70">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Tenant' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}
