import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { createToken, hashPassword, sanitizeUser, verifyPassword } from '../services/auth.service.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(payload.password);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
        userType: payload.userType,
      },
    });

    const safeUser = sanitizeUser(user);
    const token = createToken(safeUser);
    res.cookie('auth_token', token, cookieOptions());
    return res.status(201).json({ user: safeUser, token });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return next(new HttpError(409, 'Email is already registered'));
    }
    return next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const safeUser = sanitizeUser(user);
    const token = createToken(safeUser);
    res.cookie('auth_token', token, cookieOptions());
    return res.json({ user: safeUser, token });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('auth_token');
  return res.status(204).send();
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}
