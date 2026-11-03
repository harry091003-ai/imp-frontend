import { Link } from 'react-router';
import { Sparkles } from 'lucide-react';
import { ROUTES } from '@/shared/lib/constants/routes';
import { toApiError } from '@/shared/lib/http/errors';
import { Button, Card, InlineAlert, Spinner, TraceReference } from '@/shared/ui';
import { useSuggestion } from '../hooks';
import type { AiIncidentText } from '../types';

export interface AiSuggestionPanelProps {
  /** Null until there is enough text to ask about. */
  input: AiIncidentText | null;
}

/** AI text is untrusted. React shows it as plain text, and it is always labelled a suggestion. */
export function AiSuggestionPanel({ input }: AiSuggestionPanelProps) {
  const suggestion = useSuggestion();
  const data = suggestion.data;
  const failure = suggestion.error ? toApiError(suggestion.error) : null;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-accbg text-acc">
          <Sparkles aria-hidden="true" className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink">AI suggestion</h2>
          <p className="text-xs text-ink3">
            From your own past fixes. Check it before relying on it.
          </p>
        </div>
      </div>

      {suggestion.isPending && (
        <p role="status" className="flex items-center gap-2 text-label text-ink2">
          <Spinner /> Looking through past incidents. This can take a little while.
        </p>
      )}

      {failure && (
        <InlineAlert tone={failure.status === 429 ? 'warning' : 'error'}>
          {failure.status === 429
            ? `You have used your AI requests for now. Try again in ${String(failure.retryAfterSeconds ?? 60)} seconds.`
            : failure.message}
          {failure.traceId && <TraceReference traceId={failure.traceId} className="mt-1 flex" />}
        </InlineAlert>
      )}

      {data?.status === 'NOT_ENOUGH_SIMILAR_INCIDENTS' && (
        <p className="text-label text-ink2">
          No similar past incidents yet, so there is nothing reliable to suggest.
        </p>
      )}

      {data?.status === 'OK' && (
        <div className="flex flex-col gap-3 text-label">
          <div>
            <h3 className="font-semibold text-ink">Likely root cause</h3>
            <p className="mt-0.5 whitespace-pre-wrap text-ink2">{data.rootCause}</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">What fixed it before</h3>
            <p className="mt-0.5 whitespace-pre-wrap text-ink2">{data.resolutionNotes}</p>
          </div>
          {!data.sameCategoryAndService && (
            <p className="text-xs text-ink3">
              Based on incidents from other services or categories, so treat it with more care.
            </p>
          )}
          {(data.sources?.length ?? 0) > 0 && (
            <div>
              <h3 className="font-semibold text-ink">Based on</h3>
              <ul className="mt-1 flex flex-col gap-1">
                {data.sources?.map((source) => (
                  <li
                    key={source.incidentId}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    {source.incidentId && (
                      <Link
                        to={ROUTES.incident(source.incidentId)}
                        className="font-mono font-medium text-acc hover:underline"
                      >
                        {source.incidentId.slice(0, 8)}
                      </Link>
                    )}
                    <span className="text-ink3 tabular-nums">
                      {Math.round(source.similarity * 100)}% similar
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <Button
        disabled={!input || suggestion.isPending}
        onClick={() => {
          if (input) suggestion.mutate(input);
        }}
      >
        <Sparkles aria-hidden="true" />
        {data ? 'Ask again' : 'Get a suggestion'}
      </Button>
      {!input && <p className="text-xs text-ink3">Add a title and description first.</p>}
    </Card>
  );
}
