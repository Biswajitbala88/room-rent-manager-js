import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import { hashPassword, sanitizeUser, verifyPassword } from '../services/auth.service.js';
import { updatePasswordSchema, updateProfileSchema } from '../schemas/auth.schema.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.patch('/', async (req, res, next) => {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: payload,
    });

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return next(new HttpError(409, 'Email is already registered'));
    }
    return next(error);
  }
});

profileRouter.patch('/password', async (req, res, next) => {
  try {
    const payload = updatePasswordSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

    if (!(await verifyPassword(payload.currentPassword, user.passwordHash))) {
      throw new HttpError(422, 'Current password is incorrect');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(payload.password) },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

profileRouter.delete('/', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.user!.id } });
    res.clearCookie('auth_token');
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
