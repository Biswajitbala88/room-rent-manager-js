import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

function tenantWhere(userType: string, userId: number): Prisma.TenantWhereInput {
  return userType === 'SA' ? {} : { parentId: userId };
}

/* ------------------------------------------------------------------ */
/*  SUMMARY — GET /api/dashboard?month=YYYY-MM                        */
/* ------------------------------------------------------------------ */
dashboardRouter.get('/', async (req, res, next) => {
  try {
    const month =
      typeof req.query.month === 'string' ? req.query.month : new Date().toISOString().slice(0, 7);

    const invoices = await prisma.invoice.findMany({
      where: {
        month,
        tenant: { ...tenantWhere(req.user!.userType, req.user!.id) },
      },
      select: {
        totalAmount: true,
        receivedAmount: true,
        electricityCharge: true,
        electricityUnits: true,
      },
    });

    let pendingInvoices = 0;
    let dueAmount = 0;
    let receivedAmount = 0;
    let electricityCost = 0;

    for (const inv of invoices) {
      const total = Number(inv.totalAmount);
      const received = Number(inv.receivedAmount);
      receivedAmount += received;
      electricityCost += Number(inv.electricityCharge);

      if (received < total) {
        pendingInvoices++;
        dueAmount += total - received;
      }
    }

    const electricityUnits =
      env.ELECTRIC_RATE > 0 ? Math.round(electricityCost / env.ELECTRIC_RATE) : 0;

    return res.json({
      month,
      pendingInvoices,
      dueAmount,
      receivedAmount,
      electricityUnits,
      electricityCost,
      electricRate: env.ELECTRIC_RATE,
    });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  DUE TENANTS — GET /api/dashboard/due-tenants                       */
/* ------------------------------------------------------------------ */
dashboardRouter.get('/due-tenants', async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        ...tenantWhere(req.user!.userType, req.user!.id),
        status: 'active',
        invoices: {
          some: {
            isExcluded: false,
            // Due = receivedAmount < totalAmount — we filter in-memory below
          },
        },
      },
      include: {
        invoices: {
          where: { isExcluded: false },
          select: { id: true, totalAmount: true, receivedAmount: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Filter to tenants that actually have at least one unpaid invoice
    const data = tenants
      .map((t) => {
        const dueInvoices = t.invoices.filter(
          (i) => Number(i.receivedAmount) < Number(i.totalAmount),
        );
        const totalDue = dueInvoices.reduce(
          (sum, i) => sum + (Number(i.totalAmount) - Number(i.receivedAmount)),
          0,
        );
        return {
          id: t.id,
          name: t.name,
          roomNo: t.roomNo,
          phone: t.phone,
          dueInvoiceCount: dueInvoices.length,
          totalDue,
        };
      })
      .filter((t) => t.dueInvoiceCount > 0);

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  DUE INVOICES — GET /api/tenants/:id/due-invoices                   */
/* ------------------------------------------------------------------ */
dashboardRouter.get('/tenants/:id/due-invoices', async (req, res, next) => {
  try {
    const tenantId = Number(req.params.id);
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, ...tenantWhere(req.user!.userType, req.user!.id) },
    });
    if (!tenant) throw new HttpError(404, 'Tenant not found');

    const invoices = await prisma.invoice.findMany({
      where: { tenantId, isExcluded: false },
      orderBy: { month: 'asc' },
    });

    const data = invoices
      .filter((i) => Number(i.receivedAmount) < Number(i.totalAmount))
      .map((i) => ({
        id: i.id,
        month: i.month,
        totalAmount: Number(i.totalAmount),
        receivedAmount: Number(i.receivedAmount),
        dueAmount: Number(i.totalAmount) - Number(i.receivedAmount),
        roomNo: i.roomNo,
      }));

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});
