import { applyAccessToken, endSession } from '../session';
import { createHttpClient } from './client';

/** The one client the whole app uses. */
export const http = createHttpClient({
  onSessionEnded: endSession,
  onAccessToken: applyAccessToken,
});

export { ApiError, toApiError } from './errors';
export type { FieldError } from './errors';
