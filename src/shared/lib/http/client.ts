import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  isAxiosError,
  isCancel,
} from 'axios';
import { z } from 'zod';
import { CLIENT_ERROR_CODES, ERROR_CODES } from '../constants/errorCodes';
import { env } from '../env';
import { ApiError, toApiError } from './errors';

const REQUEST_TIMEOUT_MS = 15_000; // The gateway gives up at 10 s, so its 504 arrives first.
const GET_RETRIES = 2;
const REFRESH_LOCK_NAME = 'imp-token-refresh';
const TRACE_ID_HEADER = 'X-Trace-Id';

const REFRESHABLE_CODES = new Set<string>([ERROR_CODES.INVALID_TOKEN, ERROR_CODES.MISSING_TOKEN]);
const SESSION_ENDING_CODES = new Set<string>([
  ERROR_CODES.TOKEN_REVOKED,
  ERROR_CODES.REFRESH_TOKEN_REUSED,
  ERROR_CODES.REFRESH_TOKEN_EXPIRED,
  ERROR_CODES.INVALID_REFRESH_TOKEN,
  ERROR_CODES.ACCOUNT_LOCKED,
  CLIENT_ERROR_CODES.INVALID_RESPONSE,
]);

// Proposed contract (BCR-02): the refresh token travels in an HttpOnly cookie, never in JavaScript.
// The key is unconfirmed: the Java field is JWTtoken, but Jackson should send jwttoken. Accept
// either until one real login call settles it (phase-0-plan.md, open items).
const refreshResponseSchema = z
  .object({ jwttoken: z.string().min(1).optional(), JWTtoken: z.string().min(1).optional() })
  .transform((body) => body.jwttoken ?? body.JWTtoken)
  .pipe(z.string());

type TrackedConfig = InternalAxiosRequestConfig & {
  authRetried?: boolean;
  getRetries?: number;
};

export interface HttpClientOptions {
  /** The session cannot continue. The app clears its data and shows the sign-in page. */
  onSessionEnded: (code: string) => void;
  /** Called with each new token, so the app can read who the user is from it. */
  onAccessToken?: (token: string) => void;
  retryDelayMs?: number;
}

export interface HttpClient {
  api: AxiosInstance;
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  /** Asks for a new token with the refresh cookie, such as after a page reload. */
  refreshSession: () => Promise<void>;
}

function newTraceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** One refresh across browser tabs. The next tab then sends the newest cookie, never a used one. */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (!('locks' in navigator)) return task();
  return navigator.locks.request(REFRESH_LOCK_NAME, task);
}

function isRetriableGet(error: ApiError, config: TrackedConfig): boolean {
  if (config.method?.toLowerCase() !== 'get') return false;
  if ((config.getRetries ?? 0) >= GET_RETRIES) return false;
  return error.code === CLIENT_ERROR_CODES.NETWORK_ERROR || [502, 503].includes(error.status);
}

export function createHttpClient({
  onSessionEnded,
  onAccessToken,
  retryDelayMs = 300,
}: HttpClientOptions): HttpClient {
  // In memory only: gone on reload, and out of reach of anything reading browser storage.
  let accessToken: string | null = null;
  let refreshInFlight: Promise<void> | null = null;

  const api = axios.create({ baseURL: env.apiBaseUrl, timeout: REQUEST_TIMEOUT_MS });
  // Separate, so a failed refresh cannot trigger another refresh.
  const refreshApi = axios.create({ baseURL: env.apiBaseUrl, timeout: REQUEST_TIMEOUT_MS });

  function endSession(code: string): void {
    accessToken = null;
    onSessionEnded(code);
  }

  async function requestNewToken(): Promise<void> {
    try {
      const response = await refreshApi.post<unknown>('/auth/refresh', undefined, {
        headers: { [TRACE_ID_HEADER]: newTraceId() },
      });
      const token = refreshResponseSchema.safeParse(response.data);
      if (!token.success) {
        throw new ApiError({
          status: response.status,
          code: CLIENT_ERROR_CODES.INVALID_RESPONSE,
          message: 'Your session could not be renewed. Please sign in again.',
          traceId: null,
          fieldErrors: [],
          retryAfterSeconds: null,
        });
      }
      accessToken = token.data;
      onAccessToken?.(token.data);
    } catch (error) {
      const apiError = toApiError(error);
      // A server outage is not the user's fault, so it does not sign them out.
      if (SESSION_ENDING_CODES.has(apiError.code)) endSession(apiError.code);
      throw apiError;
    }
  }

  /** One refresh per tab: every request that expired at the same moment waits for this one. */
  function refreshOnce(): Promise<void> {
    refreshInFlight ??= withRefreshLock(requestNewToken).finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  api.interceptors.request.use((config) => {
    if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
    else config.headers.delete('Authorization');
    if (!config.headers.has(TRACE_ID_HEADER)) config.headers.set(TRACE_ID_HEADER, newTraceId());
    return config;
  });

  api.interceptors.response.use(undefined, async (error: unknown) => {
    if (isCancel(error)) throw error;

    const apiError = toApiError(error);
    const config = isAxiosError(error) ? (error.config as TrackedConfig | undefined) : undefined;
    if (!config) throw apiError;

    if (apiError.status === 401 && REFRESHABLE_CODES.has(apiError.code) && !config.authRetried) {
      config.authRetried = true;
      // The gateway refused this request before doing anything, so one retry is safe for any method.
      const sentHeader = config.headers.get('Authorization');
      if (!accessToken || sentHeader === `Bearer ${accessToken}`) await refreshOnce();
      return api.request(config);
    }

    if (SESSION_ENDING_CODES.has(apiError.code)) endSession(apiError.code);

    if (isRetriableGet(apiError, config)) {
      const attempt = (config.getRetries ?? 0) + 1;
      config.getRetries = attempt;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
      return api.request(config);
    }

    throw apiError;
  });

  return {
    api,
    getAccessToken: () => accessToken,
    setAccessToken: (token) => {
      accessToken = token;
      if (token) onAccessToken?.(token);
    },
    refreshSession: refreshOnce,
  };
}
