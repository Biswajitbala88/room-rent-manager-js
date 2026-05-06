import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../lib/http.js';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  return sendError(res, error);
}
