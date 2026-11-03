import { describe, expect, it, vi } from 'vitest';
import { cn } from './cn';
import { formatDuration, formatRelative, parseBackendDate } from './date';
import { applyServerFieldErrors } from './forms';
import { getSlaView } from './sla';

const NOW = new Date('2026-11-02T12:00:00Z');

describe('parseBackendDate', () => {
  it('reads a LocalDateTime in the server clock, which defaults to UTC', () => {
    expect(parseBackendDate('2026-11-02T10:00:00')?.toISOString()).toBe('2026-11-02T10:00:00.000Z');
  });

  it('handles the 9 fractional digits Java can send', () => {
    expect(parseBackendDate('2026-11-02T10:00:00.123456789')?.toISOString()).toBe(
      '2026-11-02T10:00:00.123Z',
    );
  });

  it('respects a zone when the value already has one', () => {
    expect(parseBackendDate('2026-11-02T10:00:00+05:30')?.toISOString()).toBe(
      '2026-11-02T04:30:00.000Z',
    );
  });

  it('keeps a date-only value on the same calendar day in any timezone', () => {
    const date = parseBackendDate('2026-11-02');
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 10, 2]);
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %s', (value) => {
    expect(parseBackendDate(value)).toBeNull();
  });
});

describe('formatting', () => {
  it.each([
    [30, '< 1m'],
    [300, '5m'],
    [3600, '1h'],
    [8100, '2h 15m'],
    [86400, '1d'],
    [93600, '1d 2h'],
    [-300, '5m'],
  ])('formats %d seconds as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it('describes past times in words', () => {
    expect(formatRelative(new Date('2026-11-02T09:00:00Z'), NOW)).toBe('3 hours ago');
    expect(formatRelative(new Date('2026-11-02T11:59:50Z'), NOW)).toBe('just now');
  });
});

describe('getSlaView', () => {
  it('is calm with plenty of time left', () => {
    expect(
      getSlaView(
        { deadline: '2026-11-02T20:00:00', startedAt: '2026-11-02T10:00:00', breached: false },
        NOW,
      ),
    ).toEqual({ tone: 'ok', label: '8h left' });
  });

  it('warns in the last quarter of the window', () => {
    expect(
      getSlaView({ deadline: '2026-11-02T12:30:00', startedAt: '2026-11-02T10:00:00' }, NOW),
    ).toEqual({ tone: 'risk', label: '30m left' });
  });

  it('says breached after the deadline', () => {
    expect(getSlaView({ deadline: '2026-11-02T11:45:00' }, NOW)).toEqual({
      tone: 'bad',
      label: 'Breached 15m ago',
    });
  });

  it('trusts the backend when it says breached, even if the browser clock disagrees', () => {
    expect(getSlaView({ deadline: '2026-11-02T13:00:00', breached: true }, NOW).tone).toBe('bad');
  });

  it('stops counting once resolved', () => {
    expect(
      getSlaView({ deadline: '2026-11-02T11:00:00', stoppedAt: '2026-11-02T10:30:00' }, NOW),
    ).toEqual({ tone: 'ok', label: 'SLA met' });
    expect(
      getSlaView({ deadline: '2026-11-02T11:00:00', stoppedAt: '2026-11-02T11:30:00' }, NOW),
    ).toEqual({ tone: 'bad', label: 'SLA missed' });
  });

  it('never invents a countdown with no deadline', () => {
    expect(getSlaView({ deadline: null }, NOW)).toEqual({ tone: 'idle', label: 'No SLA' });
  });
});

describe('applyServerFieldErrors', () => {
  it('puts errors on their fields and returns the rest, focusing only the first', () => {
    const setError = vi.fn();
    const unmatched = applyServerFieldErrors<{ title: string; severity: string }>(
      [
        { field: 'title', message: 'Too long' },
        { field: 'severity', message: 'Required' },
        { field: 'internalThing', message: 'Bad' },
      ],
      ['title', 'severity'],
      setError,
    );

    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenNthCalledWith(
      1,
      'title',
      { type: 'server', message: 'Too long' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      'severity',
      { type: 'server', message: 'Required' },
      { shouldFocus: false },
    );
    expect(unmatched).toEqual([{ field: 'internalThing', message: 'Bad' }]);
  });
});

describe('cn', () => {
  it('lets a later class override, and keeps our custom sizes apart from colours', () => {
    expect(cn('h-9', 'h-11')).toBe('h-11');
    expect(cn('text-label', 'text-ink')).toBe('text-label text-ink');
    expect(cn('text-label', 'text-sm')).toBe('text-sm');
    expect(cn('rounded-btn', 'rounded-card')).toBe('rounded-card');
  });
});
