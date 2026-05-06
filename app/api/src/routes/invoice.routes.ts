import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { createInvoiceSchema, updateInvoiceSchema, addPaymentSchema } from '../schemas/invoice.schema.js';
import { calculateInvoice, getLastUnits } from '../services/invoice.service.js';

export const invoiceRouter = Router();
invoiceRouter.use(requireAuth);

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function tenantWhere(userType: string, userId: number): Prisma.TenantWhereInput {
  return userType === 'SA' ? {} : { parentId: userId };
}

/* ------------------------------------------------------------------ */
/*  LAST UNITS — GET /api/tenants/:tenantId/last-units?month=         */
/* ------------------------------------------------------------------ */
invoiceRouter.get('/tenants/:tenantId/last-units', async (req, res, next) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const month = typeof req.query.month === 'string' ? req.query.month : '';
    const lastUnits = await getLastUnits(tenantId, month);
    return res.json({ lastUnits });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  LIST                                                               */
/* ------------------------------------------------------------------ */
invoiceRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.min(Math.max(Number(req.query.perPage) || 15, 1), 100);
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;

    const where: Prisma.InvoiceWhereInput = {
      tenant: { ...tenantWhere(req.user!.userType, req.user!.id) },
      ...(month ? { month } : {}),
      ...(search
        ? {
            OR: [
              { tenant: { name: { contains: search } } },
              { roomNo: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          tenant: {
            select: { id: true, name: true, roomNo: true, parentId: true, owner: { select: { name: true } } },
          },
        },
        orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Compute consumed units for each invoice
    const enriched = await Promise.all(
      data.map(async (inv) => {
        const prevUnits = await getLastUnits(inv.tenantId, inv.month);
        const consumedUnits = Math.max(Number(inv.electricityUnits) - prevUnits, 0);
        const dueAmount = Number(inv.totalAmount) - Number(inv.receivedAmount);
        return { ...inv, consumedUnits, dueAmount };
      }),
    );

    return res.json({ data: enriched, total, page, perPage, totalPages: Math.ceil(total / perPage) });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  CREATE                                                             */
/* ------------------------------------------------------------------ */
invoiceRouter.post('/', async (req, res, next) => {
  try {
    const payload = createInvoiceSchema.parse(req.body);

    const tenant = await prisma.tenant.findFirst({
      where: { id: payload.tenantId, ...tenantWhere(req.user!.userType, req.user!.id) },
    });
    if (!tenant) throw new HttpError(404, 'Tenant not found');

    // Check if tenant start month matches invoice month (first month rule)
    const tenantStartMonth = tenant.startDate.toISOString().slice(0, 7);
    const isFirstMonth = payload.month === tenantStartMonth;

    const lastUnits = await getLastUnits(tenant.id, payload.month);

    const calc = calculateInvoice({
      rentAmount: Number(tenant.rentAmount),
      currentUnits: payload.electricityUnits,
      lastUnits,
      isWaterCharge: tenant.isWaterCharge,
      waterCharge: Number(tenant.waterCharge),
      isFirstMonth,
      isCloser: payload.closer,
      isAdvanced: tenant.isAdvanced,
    });

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        roomNo: tenant.roomNo,
        month: payload.month,
        electricityUnits: payload.electricityUnits,
        electricityCharge: calc.electricityCharge,
        waterCharge: calc.waterCharge,
        totalAmount: calc.totalAmount,
        receivedAmount: payload.receivedAmount,
        status: payload.receivedAmount >= calc.totalAmount ? 'paid' : 'unpaid',
      },
      include: { tenant: { select: { id: true, name: true, roomNo: true } } },
    });

    // Create payment transaction if received amount > 0
    if (payload.receivedAmount > 0) {
      await prisma.transaction.create({
        data: {
          tenantId: tenant.id,
          invoiceId: invoice.id,
          amount: payload.receivedAmount,
          paymentMode: payload.paymentMode || 'Cash',
          paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
        },
      });
    }

    // Closer flow: set tenant status to close
    if (payload.closer) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'close' },
      });
    }

    return res.status(201).json({ data: invoice });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  DETAIL                                                             */
/* ------------------------------------------------------------------ */
invoiceRouter.get('/:id', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: Number(req.params.id),
        tenant: { ...tenantWhere(req.user!.userType, req.user!.id) },
      },
      include: {
        tenant: {
          select: { id: true, name: true, roomNo: true, rentAmount: true, isWaterCharge: true, waterCharge: true, isAdvanced: true, startDate: true, parentId: true },
        },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!invoice) throw new HttpError(404, 'Invoice not found');

    const prevUnits = await getLastUnits(invoice.tenantId, invoice.month);
    return res.json({ data: { ...invoice, previousUnits: prevUnits } });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  UPDATE                                                             */
/* ------------------------------------------------------------------ */
invoiceRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.invoice.findFirst({
      where: { id, tenant: { ...tenantWhere(req.user!.userType, req.user!.id) } },
      include: { tenant: true },
    });
    if (!existing) throw new HttpError(404, 'Invoice not found');

    const payload = updateInvoiceSchema.parse(req.body);

    // Recalculate if units changed
    let updateData: Record<string, unknown> = {};

    if (payload.electricityUnits !== undefined) {
      const lastUnits = await getLastUnits(existing.tenantId, existing.month);
      const tenantStartMonth = existing.tenant.startDate.toISOString().slice(0, 7);
      const isFirstMonth = existing.month === tenantStartMonth;

      const calc = calculateInvoice({
        rentAmount: Number(existing.tenant.rentAmount),
        currentUnits: payload.electricityUnits,
        lastUnits,
        isWaterCharge: existing.tenant.isWaterCharge,
        waterCharge: Number(existing.tenant.waterCharge),
        isFirstMonth,
        isCloser: false,
        isAdvanced: existing.tenant.isAdvanced,
      });

      updateData = {
        electricityUnits: payload.electricityUnits,
        electricityCharge: calc.electricityCharge,
        waterCharge: calc.waterCharge,
        totalAmount: calc.totalAmount,
      };
    }

    // Handle received amount increase — create transaction for delta
    if (payload.receivedAmount !== undefined) {
      const oldReceived = Number(existing.receivedAmount);
      const newReceived = payload.receivedAmount;
      const delta = newReceived - oldReceived;

      if (delta > 0) {
        await prisma.transaction.create({
          data: {
            tenantId: existing.tenantId,
            invoiceId: id,
            amount: delta,
            paymentMode: payload.paymentMode || 'Cash',
            paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
          },
        });
      }

      updateData.receivedAmount = newReceived;
      const totalForStatus = (updateData.totalAmount as number) ?? Number(existing.totalAmount);
      updateData.status = newReceived >= totalForStatus ? 'paid' : 'unpaid';
    }

    if (payload.isExcluded !== undefined) {
      updateData.isExcluded = payload.isExcluded;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { tenant: { select: { id: true, name: true, roomNo: true } } },
    });

    return res.json({ data: invoice });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  DELETE                                                             */
/* ------------------------------------------------------------------ */
invoiceRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.invoice.findFirst({
      where: { id, tenant: { ...tenantWhere(req.user!.userType, req.user!.id) } },
    });
    if (!existing) throw new HttpError(404, 'Invoice not found');

    await prisma.transaction.deleteMany({ where: { invoiceId: id } });
    await prisma.paymentHistory.deleteMany({ where: { invoiceId: id } });
    await prisma.electricityUnit.deleteMany({ where: { invoiceId: id } });
    await prisma.invoice.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  ADD PAYMENT — POST /api/invoices/:id/payments                      */
/* ------------------------------------------------------------------ */
invoiceRouter.post('/:id/payments', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.invoice.findFirst({
      where: { id, tenant: { ...tenantWhere(req.user!.userType, req.user!.id) } },
    });
    if (!existing) throw new HttpError(404, 'Invoice not found');

    const payload = addPaymentSchema.parse(req.body);

    await prisma.transaction.create({
      data: {
        tenantId: existing.tenantId,
        invoiceId: id,
        amount: payload.amount,
        paymentMode: payload.paymentMode,
        paymentDate: new Date(payload.paymentDate),
      },
    });

    const newReceived = Number(existing.receivedAmount) + payload.amount;
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        receivedAmount: newReceived,
        status: newReceived >= Number(existing.totalAmount) ? 'paid' : 'unpaid',
      },
      include: { tenant: { select: { id: true, name: true, roomNo: true } } },
    });

    return res.json({ data: invoice });
  } catch (error) {
    return next(error);
  }
});
