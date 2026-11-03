import { z, type ZodType } from 'zod';
import { CLIENT_ERROR_CODES } from '../constants/errorCodes';
import { ApiError } from '../http/errors';

/** A Spring `Page`. Only the fields we use: the backend sends more. */
export function pageSchema<T>(item: ZodType<T>) {
  return z.object({
    content: z.array(item),
    totalElements: z.number(),
    totalPages: z.number(),
    number: z.number(),
    size: z.number(),
  });
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/**
 * Checks an answer against its schema. If the backend's shape ever differs from what we expect,
 * this fails in one clear place, rather than as a blank screen somewhere else.
 */
export function parseResponse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw new ApiError({
    status: 0,
    code: CLIENT_ERROR_CODES.INVALID_RESPONSE,
    message: 'The server sent an answer this page does not understand.',
    traceId: null,
    fieldErrors: [],
    retryAfterSeconds: null,
  });
}
