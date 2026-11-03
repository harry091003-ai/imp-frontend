import { z } from 'zod';

const envSchema = z.object({
  // A relative path only: an absolute URL would need CORS and could send tokens to another host.
  VITE_API_BASE_URL: z
    .string()
    .regex(/^\/(?!\/)[A-Za-z0-9/_-]*$/, 'must be a same-origin path such as /api')
    .default('/api'),
  VITE_SERVER_UTC_OFFSET: z
    .string()
    .regex(/^[+-]\d{2}:\d{2}$/, 'must look like +00:00 or +05:30')
    .default('+00:00'),
  VITE_API_MOCKING: z.enum(['true', 'false']).default('true'),
});

const parsed = envSchema.parse(import.meta.env);

export const env = {
  apiBaseUrl: parsed.VITE_API_BASE_URL,
  serverUtcOffset: parsed.VITE_SERVER_UTC_OFFSET,
  // Never on in a production build, whatever the setting says.
  apiMocking: import.meta.env.DEV && parsed.VITE_API_MOCKING === 'true',
} as const;
