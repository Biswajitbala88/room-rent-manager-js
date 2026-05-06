import { z } from 'zod';

export const createInvoiceSchema = z.object({
  tenantId: z.coerce.number(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
  electricityUnits: z.coerce.number().min(0).default(0),
  receivedAmount: z.coerce.number().min(0).default(0),
  paymentMode: z.string().optional(),
  paymentDate: z.string().optional(),
  closer: z.coerce.boolean().default(false),
});

export const updateInvoiceSchema = z.object({
  electricityUnits: z.coerce.number().min(0).optional(),
  receivedAmount: z.coerce.number().min(0).optional(),
  paymentMode: z.string().optional(),
  paymentDate: z.string().optional(),
  isExcluded: z.coerce.boolean().optional(),
});

export const addPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  paymentMode: z.string().min(1),
  paymentDate: z.string().min(1),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
