import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn';

/** The backend's trace id, which finds this exact failure in the server logs. */
export function TraceReference({ traceId, className }: { traceId: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopied(true);
    } catch {
      // Clipboard access can be refused. The reference is still on screen to read.
    }
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-ink3', className)}>
      Reference: <code className="font-mono text-ink2">{traceId}</code>
      <button
        type="button"
        aria-label={copied ? 'Reference copied' : 'Copy reference'}
        onClick={() => void copy()}
        className="inline-flex size-6 items-center justify-center rounded-md hover:bg-sunken max-md:size-11"
      >
        {copied ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
      </button>
    </span>
  );
}
