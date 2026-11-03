import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { parseBackendDate } from '@/shared/lib/date';
import { useCurrentUser } from '@/shared/lib/session';
import { fetchNotifications } from '../api';
import type { Notification } from '../types';

const ROOT = 'notifications';
const PAGE_SIZE = 20;
const POLL_MS = 30_000;

export function useAlerts() {
  return useInfiniteQuery({
    queryKey: [ROOT, 'list'],
    queryFn: ({ pageParam }) => fetchNotifications(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      (last.page + 1) * last.size < last.total ? last.page + 1 : undefined,
  });
}

/** Polls every 30 s, and pauses while the tab is hidden, to respect the rate limit. */
export function useLatestAlerts(size = 20) {
  return useQuery({
    queryKey: [ROOT, 'latest', size],
    queryFn: () => fetchNotifications(0, size),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
}

// The backend has no read state yet (BCR-12), so "new" means "newer than your last visit in this
// browser". The page says so rather than claiming it is synced across devices.
const lastSeenKey = (userId: string) => `imp-alerts-seen-${userId}`;

function readLastSeen(userId: string): number {
  try {
    return Number(localStorage.getItem(lastSeenKey(userId)) ?? 0);
  } catch {
    return 0;
  }
}

export function isNewAlert(alert: Notification, lastSeen: number): boolean {
  const created = parseBackendDate(alert.createdAt);
  return created !== null && created.getTime() > lastSeen;
}

const SEEN_EVENT = 'imp-alerts-seen';
// Kept here too, so "mark as seen" still works for this page view if browser storage is blocked.
let seenThisVisit = 0;

function subscribeToSeen(onChange: () => void): () => void {
  window.addEventListener(SEEN_EVENT, onChange);
  return () => {
    window.removeEventListener(SEEN_EVENT, onChange);
  };
}

export function useLastSeen() {
  const user = useCurrentUser();
  const lastSeen = useSyncExternalStore(subscribeToSeen, () =>
    Math.max(readLastSeen(user.id), seenThisVisit),
  );
  const markAllSeen = useCallback(() => {
    seenThisVisit = Date.now();
    try {
      localStorage.setItem(lastSeenKey(user.id), String(seenThisVisit));
    } catch {
      // Storage can be blocked. It still applies until the page reloads.
    }
    window.dispatchEvent(new Event(SEEN_EVENT));
  }, [user.id]);
  return { lastSeen, markAllSeen };
}

export function useNewAlertCount(): number {
  const latest = useLatestAlerts();
  const { lastSeen } = useLastSeen();
  return (latest.data?.items ?? []).filter((alert) => isNewAlert(alert, lastSeen)).length;
}
