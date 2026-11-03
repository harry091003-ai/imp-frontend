import { useNow } from '../hooks/useNow';
import { formatDate, formatDateTime, formatRelative, parseBackendDate } from '../lib/date';

export interface DateTimeProps {
  /** A backend date string. */
  value: string | null | undefined;
  format?: 'relative' | 'datetime' | 'date';
  className?: string;
}

const EMPTY = '—';

function RelativeTime({ date, className }: { date: Date; className?: string | undefined }) {
  const now = useNow();
  return (
    <time dateTime={date.toISOString()} title={formatDateTime(date)} className={className}>
      {formatRelative(date, now)}
    </time>
  );
}

export function DateTime({ value, format = 'datetime', className }: DateTimeProps) {
  const date = parseBackendDate(value);
  if (!date) return <span className={className}>{EMPTY}</span>;
  if (format === 'relative') return <RelativeTime date={date} className={className} />;
  return (
    <time dateTime={date.toISOString()} className={className}>
      {format === 'date' ? formatDate(date) : formatDateTime(date)}
    </time>
  );
}
