import { CircleAlert, CircleCheck, Info, RotateCw, WifiOff, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { cn } from '../lib/cn';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { TraceReference } from './TraceReference';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface shadow-card', className)}
      {...props}
    />
  );
}

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Buttons on the right. They move below the title on phones. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-ink2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}>
      {Icon && (
        <span className="mb-1 flex size-10 items-center justify-center rounded-[11px] bg-sunken text-ink3">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      )}
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="max-w-md text-ink2">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  /** The message from the backend, or a friendly one. Never a raw exception. */
  message: string;
  traceId?: string | null;
  /** Leave out when trying again cannot help, such as a 403. */
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  traceId,
  onRetry,
  retrying,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}
    >
      <span className="mb-1 flex size-10 items-center justify-center rounded-[11px] bg-critbg text-crit">
        <CircleAlert aria-hidden="true" className="size-5" />
      </span>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-ink2">{message}</p>
      {traceId && <TraceReference traceId={traceId} />}
      {onRetry && (
        <Button className="mt-2" onClick={onRetry} loading={retrying}>
          {!retrying && <RotateCw aria-hidden="true" />}
          Try again
        </Button>
      )}
    </div>
  );
}

const ALERT_TONES = {
  info: { icon: Info, styles: 'border-accline bg-accbg text-acc' },
  success: { icon: CircleCheck, styles: 'border-transparent bg-s-resbg text-s-res' },
  warning: { icon: CircleAlert, styles: 'border-transparent bg-highbg text-high' },
  error: { icon: CircleAlert, styles: 'border-transparent bg-critbg text-crit' },
};

export interface InlineAlertProps {
  tone?: keyof typeof ALERT_TONES;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function InlineAlert({ tone = 'info', title, children, className }: InlineAlertProps) {
  const { icon: Icon, styles } = ALERT_TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-input border p-3 text-label', styles, className)}
    >
      <Icon aria-hidden="true" className="mt-px size-4 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-highbg px-4 py-2 text-label font-medium text-high"
    >
      <WifiOff aria-hidden="true" className="size-4" />
      You are offline. Changes will not be saved until you reconnect.
    </div>
  );
}

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function StatCard({ label, value, hint, loading = false, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-1.5 p-4', className)} aria-busy={loading || undefined}>
      <p className="text-[11px] font-semibold tracking-wide text-ink3 uppercase">{label}</p>
      {loading ? (
        <Skeleton className="my-1.5 h-6 w-20" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      )}
      {hint && !loading && <p className="text-xs text-ink3">{hint}</p>}
    </Card>
  );
}

export interface ChartCardProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  /** Replaces the chart, such as an ErrorState. */
  error?: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  /** Text version of the chart for screen readers, such as "Incidents rose from 4 to 11". */
  summary?: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  action,
  loading = false,
  error,
  empty = false,
  emptyMessage = 'No data for this period yet.',
  summary,
  children,
  className,
}: ChartCardProps) {
  let body = children;
  if (loading) body = <Skeleton className="h-full min-h-48 w-full rounded-input" />;
  else if (error) body = error;
  else if (empty) body = <EmptyState title={emptyMessage} />;

  return (
    <Card className={cn('flex flex-col gap-4 p-5', className)} aria-busy={loading || undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-label text-ink3">{description}</p>}
        </div>
        {action}
      </div>
      {summary && !loading && !error && !empty && <p className="sr-only">{summary}</p>}
      <div className="min-h-48 min-w-0 flex-1">{body}</div>
    </Card>
  );
}
