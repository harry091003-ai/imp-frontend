import { z } from 'zod';

const envSchema = z.object({
  // A relative path only: an absolute URL would need CORS and could send tokens to another host.
  VITE_API_BASE_URL: z
    .string()
    .regex(/^\/(?!\/)[A-Za-z0-9/_-]*$/, 'must be a same-origin path such as /api')
    .default('/api'),
});

const parsed = envSchema.parse(import.meta.env);

export const env = {
  apiBaseUrl: parsed.VITE_API_BASE_URL,
} as const;
