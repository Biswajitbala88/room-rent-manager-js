import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http.js';

export type AuthUser = Pick<User, 'id' | 'name' | 'email' | 'userType'>;

export function sanitizeUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.userType,
  };
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createToken(user: AuthUser) {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign({ sub: user.id, userType: user.userType }, env.JWT_SECRET, options);
}

export function verifyToken(token: string) {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload === 'string' || (typeof payload.sub !== 'string' && typeof payload.sub !== 'number')) {
    throw new HttpError(401, 'Authentication required');
  }

  return { sub: Number(payload.sub), userType: String(payload.userType) };
}
