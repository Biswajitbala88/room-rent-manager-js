import { apiFetch } from './client';

export type Invoice = {
  id: number;
  roomNo: string | null;
  tenantId: number;
  month: string;
  electricityUnits: number;
  electricityCharge: number;
  waterCharge: number;
  totalAmount: number;
  receivedAmount: number;
  isExcluded: boolean;
  status: string;
  createdAt: string;
  consumedUnits?: number;
  dueAmount?: number;
  previousUnits?: number;
  tenant?: {
    id: number;
    name: string;
    roomNo: string;
    rentAmount?: number;
    isWaterCharge?: boolean;
    waterCharge?: number;
    isAdvanced?: boolean;
    startDate?: string;
    parentId?: number;
    owner?: { name: string } | null;
  };
  transactions?: Array<{
    id: number;
    amount: number;
    paymentMode: string;
    paymentDate: string;
    createdAt: string;
  }>;
};

export type InvoiceListResponse = {
  data: Invoice[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type DueTenant = {
  id: number;
  name: string;
  roomNo: string;
  phone: string;
  dueInvoiceCount: number;
  totalDue: number;
};

export type DueInvoice = {
  id: number;
  month: string;
  totalAmount: number;
  receivedAmount: number;
  dueAmount: number;
  roomNo: string | null;
};

export type ElectricityRecord = {
  id: number;
  tenant: { id: number; name: string; roomNo: string };
  month: string;
  currentUnits: number;
  previousUnits: number;
  usedUnits: number;
  rate: number;
  cost: number;
};

export type ElectricityListResponse = {
  data: ElectricityRecord[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  summary: { totalUnits: number; totalCost: number; rate: number };
};

export function listInvoices(params: { page?: number; search?: string; month?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.search) qs.set('search', params.search);
  if (params.month) qs.set('month', params.month);
  return apiFetch<InvoiceListResponse>(`/invoices?${qs}`);
}

export function getInvoice(id: number) {
  return apiFetch<{ data: Invoice }>(`/invoices/${id}`);
}

export function createInvoice(data: Record<string, unknown>) {
  return apiFetch<{ data: Invoice }>('/invoices', { method: 'POST', json: data });
}

export function updateInvoice(id: number, data: Record<string, unknown>) {
  return apiFetch<{ data: Invoice }>(`/invoices/${id}`, { method: 'PATCH', json: data });
}

export function deleteInvoice(id: number) {
  return apiFetch<void>(`/invoices/${id}`, { method: 'DELETE' });
}

export function getLastUnits(tenantId: number, month: string) {
  return apiFetch<{ lastUnits: number }>(`/tenants/${tenantId}/last-units?month=${month}`);
}

export function addPayment(invoiceId: number, data: { amount: number; paymentMode: string; paymentDate: string }) {
  return apiFetch<{ data: Invoice }>(`/invoices/${invoiceId}/payments`, { method: 'POST', json: data });
}

export function getDueTenants() {
  return apiFetch<{ data: DueTenant[] }>('/dashboard/due-tenants');
}

export function getDueInvoices(tenantId: number) {
  return apiFetch<{ data: DueInvoice[] }>(`/dashboard/tenants/${tenantId}/due-invoices`);
}

export function getElectricityReport(params: { page?: number; month?: string; tenantId?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.month) qs.set('month', params.month);
  if (params.tenantId) qs.set('tenantId', String(params.tenantId));
  return apiFetch<ElectricityListResponse>(`/electricity?${qs}`);
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
export function getInvoicePdfUrl(id: number) {
  return `${API_URL}/invoices/${id}/pdf`;
}
