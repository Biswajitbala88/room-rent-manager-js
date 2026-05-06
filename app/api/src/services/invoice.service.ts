import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

/**
 * Find the previous electricity reading for a tenant before a given month.
 */
export async function getLastUnits(tenantId: number, month: string): Promise<number> {
  const prev = await prisma.invoice.findFirst({
    where: {
      tenantId,
      month: { lt: month },
      electricityUnits: { gt: 0 },
    },
    orderBy: { month: 'desc' },
    select: { electricityUnits: true },
  });
  return prev ? Number(prev.electricityUnits) : 0;
}

/**
 * Calculate invoice totals.
 */
export function calculateInvoice(opts: {
  rentAmount: number;
  currentUnits: number;
  lastUnits: number;
  isWaterCharge: boolean;
  waterCharge: number;
  isFirstMonth: boolean;
  isCloser: boolean;
  isAdvanced: boolean;
}) {
  const consumedUnits = Math.max(opts.currentUnits - opts.lastUnits, 0);
  const electricityCharge = opts.isFirstMonth ? 0 : consumedUnits * env.ELECTRIC_RATE;
  const waterCharge = opts.isFirstMonth ? 0 : opts.isWaterCharge ? opts.waterCharge : 0;
  const rent = opts.isCloser && opts.isAdvanced ? 0 : opts.rentAmount;
  const totalAmount = rent + electricityCharge + waterCharge;

  return { consumedUnits, electricityCharge, waterCharge, totalAmount, rent };
}
