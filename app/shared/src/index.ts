export const USER_TYPES = ['SA', 'A'] as const;
export type UserType = (typeof USER_TYPES)[number];

export const TENANT_STATUSES = ['active', 'close'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const DEFAULT_ELECTRIC_RATE = 10;
