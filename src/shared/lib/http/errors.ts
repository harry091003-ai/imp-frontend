import { AxiosError, isAxiosError } from 'axios';
import { z } from 'zod';
import { CLIENT_ERROR_CODES } from '../constants/errorCodes';

const errorBodySchema = z.object({
  error: z.string(),
  message: z.string(),
  traceId: z.string().nullish(),
  fieldErrors: z.array(z.object({ field: z.string(), message: z.string() })).nullish(),
});

export interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorDetails {
  status: number;
  code: string;
  message: string;
  traceId: string | null;
  fieldErrors: FieldError[];
  retryAfterSeconds: number | null;
}

/** The only error type the rest of the app sees. `traceId` is shown to users as a "Reference". */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId: string | null;
  readonly fieldErrors: FieldError[];
  readonly retryAfterSeconds: number | null;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = 'ApiError';
    this.status = details.status;
    this.code = details.code;
    this.traceId = details.traceId;
    this.fieldErrors = details.fieldErrors;
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

function readHeader(error: AxiosError, name: string): string | null {
  const value: unknown = error.response?.headers[name];
  return typeof value === 'string' ? value : null;
}

function readRetryAfter(error: AxiosError): number | null {
  const seconds = Number(readHeader(error, 'retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Turns anything thrown by axios into an ApiError. A raw server page never reaches the user. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const base = { traceId: null, fieldErrors: [], retryAfterSeconds: null };
  if (!isAxiosError(error)) {
    return new ApiError({
      ...base,
      status: 0,
      code: CLIENT_ERROR_CODES.UNKNOWN,
      message: 'Something went wrong. Please try again.',
    });
  }

  if (!error.response) {
    const timedOut = error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT;
    return new ApiError({
      ...base,
      status: 0,
      code: timedOut ? CLIENT_ERROR_CODES.TIMEOUT : CLIENT_ERROR_CODES.NETWORK_ERROR,
      message: timedOut
        ? 'The server took too long to answer. Please try again.'
        : 'Could not reach the server. Check your connection and try again.',
    });
  }

  const headerTraceId = readHeader(error, 'x-trace-id');
  const retryAfterSeconds = readRetryAfter(error);
  const body = errorBodySchema.safeParse(error.response.data);
  if (!body.success) {
    return new ApiError({
      ...base,
      status: error.response.status,
      code: CLIENT_ERROR_CODES.UNKNOWN,
      message: 'The server could not complete this request. Please try again.',
      traceId: headerTraceId,
      retryAfterSeconds,
    });
  }

  return new ApiError({
    status: error.response.status,
    code: body.data.error,
    message: body.data.message,
    traceId: body.data.traceId ?? headerTraceId,
    fieldErrors: body.data.fieldErrors ?? [],
    retryAfterSeconds,
  });
}
