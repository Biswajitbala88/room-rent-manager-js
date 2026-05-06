import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { getLastUnits } from '../services/invoice.service.js';

export const electricityRouter = Router();
electricityRouter.use(requireAuth);

function tenantWhere(userType: string, userId: number): Prisma.TenantWhereInput {
  return userType === 'SA' ? {} : { parentId: userId };
}

/* ------------------------------------------------------------------ */
/*  LIST — GET /api/electricity?month=&tenantId=&page=                */
/* ------------------------------------------------------------------ */
electricityRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.min(Math.max(Number(req.query.perPage) || 15, 1), 100);
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;

    const where: Prisma.InvoiceWhereInput = {
      tenant: { ...tenantWhere(req.user!.userType, req.user!.id) },
      electricityUnits: { gt: 0 },
      ...(month ? { month } : {}),
      ...(tenantId ? { tenantId } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true, roomNo: true } },
        },
        orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Enrich with consumed units
    const enriched = await Promise.all(
      data.map(async (inv) => {
        const prevUnits = await getLastUnits(inv.tenantId, inv.month);
        const currentUnits = Number(inv.electricityUnits);
        const usedUnits = Math.max(currentUnits - prevUnits, 0);
        return {
          id: inv.id,
          tenant: inv.tenant,
          month: inv.month,
          currentUnits,
          previousUnits: prevUnits,
          usedUnits,
          rate: env.ELECTRIC_RATE,
          cost: Number(inv.electricityCharge),
        };
      }),
    );

    // Summary totals
    const allInvoices = await prisma.invoice.findMany({
      where: { ...where },
      select: { electricityCharge: true },
    });
    const totalCost = allInvoices.reduce((sum, i) => sum + Number(i.electricityCharge), 0);
    const totalUnits = env.ELECTRIC_RATE > 0 ? Math.round(totalCost / env.ELECTRIC_RATE) : 0;

    return res.json({
      data: enriched,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      summary: { totalUnits, totalCost, rate: env.ELECTRIC_RATE },
    });
  } catch (error) {
    return next(error);
  }
});
