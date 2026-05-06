import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sanitizeUser, verifyToken } from '../services/auth.service.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const cookieToken = req.cookies?.auth_token as string | undefined;
  const token = bearerToken ?? cookieToken;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    req.user = sanitizeUser(user);
    return next();
  } catch {
    return res.status(401).json({ message: 'Authentication required' });
  }
}
