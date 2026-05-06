import { Router } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { createTenantSchema, updateTenantSchema } from '../schemas/tenant.schema.js';

export const tenantRouter = Router();
tenantRouter.use(requireAuth);

/* ------------------------------------------------------------------ */
/*  Multer setup for Aadhaar uploads                                  */
/* ------------------------------------------------------------------ */
const UPLOAD_DIR = path.resolve('uploads/aadhaar');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function ownerWhere(userType: string, userId: number): Prisma.TenantWhereInput {
  return userType === 'SA' ? {} : { parentId: userId };
}

/* ------------------------------------------------------------------ */
/*  LIST                                                               */
/* ------------------------------------------------------------------ */
tenantRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.min(Math.max(Number(req.query.perPage) || 15, 1), 100);
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where: Prisma.TenantWhereInput = {
      ...ownerWhere(req.user!.userType, req.user!.id),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
              { roomNo: { contains: search } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: { owner: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.tenant.count({ where }),
    ]);

    return res.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  CREATE                                                             */
/* ------------------------------------------------------------------ */
tenantRouter.post('/', upload.array('aadhaarImages', 5), async (req, res, next) => {
  try {
    const payload = createTenantSchema.parse(req.body);

    // Owner assignment: A users own the tenant; SA can assign to any user
    const parentId = req.user!.userType === 'SA' && payload.parentId ? payload.parentId : req.user!.id;

    // Room availability check
    const existing = await prisma.tenant.findFirst({
      where: { roomNo: payload.roomNo, status: 'active' },
    });
    if (existing) {
      throw new HttpError(409, `Room ${payload.roomNo} is already occupied by an active tenant`);
    }

    // Water charge rule
    const waterCharge = payload.isWaterCharge ? payload.waterCharge : 0;

    // Build aadhaar image paths array
    const files = (req.files as Express.Multer.File[]) ?? [];
    const aadhaarPaths = files.map((f) => `/uploads/aadhaar/${f.filename}`);

    const tenant = await prisma.tenant.create({
      data: {
        name: payload.name,
        phone: payload.phone,
        roomNo: payload.roomNo,
        startDate: new Date(payload.startDate),
        rentAmount: payload.rentAmount,
        isWaterCharge: payload.isWaterCharge,
        waterCharge,
        isAdvanced: payload.isAdvanced,
        parentId,
        aadhaarImage: aadhaarPaths.length > 0 ? JSON.stringify(aadhaarPaths) : null,
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    return res.status(201).json({ data: tenant });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  DETAIL                                                             */
/* ------------------------------------------------------------------ */
tenantRouter.get('/:id', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: Number(req.params.id), ...ownerWhere(req.user!.userType, req.user!.id) },
      include: { owner: { select: { id: true, name: true } } },
    });

    if (!tenant) throw new HttpError(404, 'Tenant not found');
    return res.json({ data: tenant });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  UPDATE                                                             */
/* ------------------------------------------------------------------ */
tenantRouter.patch('/:id', upload.array('aadhaarImages', 5), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.tenant.findFirst({
      where: { id, ...ownerWhere(req.user!.userType, req.user!.id) },
    });
    if (!existing) throw new HttpError(404, 'Tenant not found');

    const payload = updateTenantSchema.parse(req.body);

    // Room uniqueness check if room changed
    if (payload.roomNo && payload.roomNo !== existing.roomNo) {
      const conflict = await prisma.tenant.findFirst({
        where: { roomNo: payload.roomNo, status: 'active', id: { not: id } },
      });
      if (conflict) {
        throw new HttpError(409, `Room ${payload.roomNo} is already occupied by an active tenant`);
      }
    }

    const waterCharge =
      payload.isWaterCharge !== undefined
        ? payload.isWaterCharge
          ? payload.waterCharge ?? existing.waterCharge
          : 0
        : undefined;

    // Merge aadhaar images
    const files = (req.files as Express.Multer.File[]) ?? [];
    const newPaths = files.map((f) => `/uploads/aadhaar/${f.filename}`);
    let aadhaarImage = existing.aadhaarImage;
    if (newPaths.length > 0) {
      const old: string[] = existing.aadhaarImage ? JSON.parse(existing.aadhaarImage) : [];
      aadhaarImage = JSON.stringify([...old, ...newPaths]);
    }
    // Allow clearing via explicit body flag
    if (req.body.clearAadhaar === 'true') {
      aadhaarImage = null;
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.roomNo !== undefined ? { roomNo: payload.roomNo } : {}),
        ...(payload.startDate !== undefined ? { startDate: new Date(payload.startDate) } : {}),
        ...(payload.rentAmount !== undefined ? { rentAmount: payload.rentAmount } : {}),
        ...(payload.isWaterCharge !== undefined ? { isWaterCharge: payload.isWaterCharge } : {}),
        ...(waterCharge !== undefined ? { waterCharge } : {}),
        ...(payload.isAdvanced !== undefined ? { isAdvanced: payload.isAdvanced } : {}),
        aadhaarImage,
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    return res.json({ data: tenant });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  DELETE                                                             */
/* ------------------------------------------------------------------ */
tenantRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.tenant.findFirst({
      where: { id, ...ownerWhere(req.user!.userType, req.user!.id) },
    });
    if (!existing) throw new HttpError(404, 'Tenant not found');

    // Delete related records first
    await prisma.transaction.deleteMany({ where: { tenantId: id } });
    await prisma.paymentHistory.deleteMany({ where: { invoice: { tenantId: id } } });
    await prisma.electricityUnit.deleteMany({ where: { invoice: { tenantId: id } } });
    await prisma.invoice.deleteMany({ where: { tenantId: id } });
    await prisma.tenant.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------------------------------------------ */
/*  TRANSACTIONS                                                       */
/* ------------------------------------------------------------------ */
tenantRouter.get('/:id/transactions', async (req, res, next) => {
  try {
    const tenantId = Number(req.params.id);
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, ...ownerWhere(req.user!.userType, req.user!.id) },
    });
    if (!tenant) throw new HttpError(404, 'Tenant not found');

    const transactions = await prisma.transaction.findMany({
      where: { tenantId },
      include: { invoice: { select: { month: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ data: transactions });
  } catch (error) {
    return next(error);
  }
});
