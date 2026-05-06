import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  roomNo: z.string().min(1),
  startDate: z.string().min(1),
  rentAmount: z.coerce.number().min(0),
  isWaterCharge: z.coerce.boolean().default(false),
  waterCharge: z.coerce.number().min(0).default(0),
  isAdvanced: z.coerce.boolean().default(false),
  parentId: z.coerce.number().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
