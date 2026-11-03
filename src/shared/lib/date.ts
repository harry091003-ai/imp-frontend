import { env } from './env';

const HAS_ZONE = /(Z|[+-]\d{2}:\d{2})$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The one place that reads backend times. LocalDateTime has no timezone, so we add the server's
 * offset. Java can send 9 digits of seconds, which browsers do not all accept, so we keep 3.
 */
export function parseBackendDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (DATE_ONLY.test(value)) return dateFromParts(value);
  const trimmed = value.replace(/(\.\d{3})\d+/, '$1');
  const date = new Date(HAS_ZONE.test(trimmed) ? trimmed : `${trimmed}${env.serverUtcOffset}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// A LocalDate is a calendar day, not a moment, so it must not shift across timezones.
function dateFromParts(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

export function formatRelative(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(seconds) >= size) return format.format(Math.trunc(seconds / size), unit);
  }
  return 'just now';
}

/** 8100 -> "2h 15m". Used for SLA time left and report averages, which arrive in seconds. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.abs(Math.round(totalSeconds));
  if (seconds < 60) return '< 1m';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return hours > 0 ? `${String(days)}d ${String(hours)}h` : `${String(days)}d`;
  if (hours > 0) return minutes > 0 ? `${String(hours)}h ${String(minutes)}m` : `${String(hours)}h`;
  return `${String(minutes)}m`;
}
