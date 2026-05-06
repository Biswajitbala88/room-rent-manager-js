import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', requireAuth, (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : new Date().toISOString().slice(0, 7);

  return res.json({
    month,
    pendingInvoices: 0,
    dueAmount: 0,
    receivedAmount: 0,
    electricityUnits: 0,
    electricityCost: 0,
    electricRate: env.ELECTRIC_RATE,
  });
});

dashboardRouter.get('/due-tenants', requireAuth, (_req, res) => {
  return res.json({ data: [] });
});
