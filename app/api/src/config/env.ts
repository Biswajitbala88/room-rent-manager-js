import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16).default('dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ELECTRIC_RATE: z.coerce.number().default(10),
});

export const env = envSchema.parse(process.env);
