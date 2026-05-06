import { apiFetch } from './client';

export type Tenant = {
  id: number;
  parentId: number | null;
  name: string;
  phone: string;
  roomNo: string;
  startDate: string;
  rentAmount: number;
  aadhaarImage: string | null;
  status: string;
  isWaterCharge: boolean;
  waterCharge: number;
  isAdvanced: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: { id: number; name: string } | null;
};

export type TenantListResponse = {
  data: Tenant[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type Transaction = {
  id: number;
  tenantId: number;
  invoiceId: number | null;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  createdAt: string;
  invoice?: { month: string } | null;
};

export function listTenants(params: { page?: number; search?: string; status?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  return apiFetch<TenantListResponse>(`/tenants?${qs}`);
}

export function getTenant(id: number) {
  return apiFetch<{ data: Tenant }>(`/tenants/${id}`);
}

export function createTenant(formData: FormData) {
  return apiFetch<{ data: Tenant }>('/tenants', {
    method: 'POST',
    body: formData,
  });
}

export function updateTenant(id: number, formData: FormData) {
  return apiFetch<{ data: Tenant }>(`/tenants/${id}`, {
    method: 'PATCH',
    body: formData,
  });
}

export function deleteTenant(id: number) {
  return apiFetch<void>(`/tenants/${id}`, { method: 'DELETE' });
}

export function getTenantTransactions(id: number) {
  return apiFetch<{ data: Transaction[] }>(`/tenants/${id}/transactions`);
}

export function listAllTenants() {
  return apiFetch<TenantListResponse>('/tenants?perPage=100');
}
