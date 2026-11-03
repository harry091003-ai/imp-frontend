import { ApiError, toApiError } from '../lib/http/errors';
import { ErrorState } from './Layout';

const CANNOT_RETRY = new Set([400, 403, 404, 409]);

/** Shows any failed request the same way: its message, its Reference and a retry if that can help. */
export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError: ApiError = toApiError(error);
  return (
    <ErrorState
      title={apiError.status === 403 ? 'You do not have access to this' : undefined}
      message={apiError.message}
      traceId={apiError.traceId}
      onRetry={CANNOT_RETRY.has(apiError.status) ? undefined : onRetry}
    />
  );
}
