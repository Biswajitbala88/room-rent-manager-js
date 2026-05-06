import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { electricityRouter } from './routes/electricity.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { invoiceRouter } from './routes/invoice.routes.js';
import { pdfRouter } from './routes/pdf.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { tenantRouter } from './routes/tenant.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('dev'));

  // Static uploads
  app.use('/uploads', express.static(path.resolve('uploads')));

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/tenants', tenantRouter);
  app.use('/api/invoices', invoiceRouter);
  app.use('/api', invoiceRouter); // For /api/tenants/:tenantId/last-units
  app.use('/api/invoices', pdfRouter);
  app.use('/api/electricity', electricityRouter);

  app.use(errorHandler);

  return app;
}
