import { CheckCheck, Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { parseBackendDate } from '@/shared/lib/date';
import {
  Button,
  Card,
  DateTime,
  EmptyState,
  InlineAlert,
  PageHeader,
  QueryError,
  SegmentedControl,
  Skeleton,
} from '@/shared/ui';
import { AlertIcon, alertLabel } from '../components/AlertIcon';
import { isNewAlert, useAlerts, useLastSeen } from '../hooks';
import { alertLink, type Notification } from '../types';

type Filter = 'all' | 'new' | 'sla' | 'changes';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'sla', label: 'SLA' },
  { value: 'changes', label: 'Incident changes' },
];

function heading(alert: Notification): string {
  const created = parseBackendDate(alert.createdAt);
  if (!created) return 'Earlier';
  const today = new Date();
  if (created.toDateString() === today.toDateString()) return 'Today';
  today.setDate(today.getDate() - 1);
  return created.toDateString() === today.toDateString() ? 'Yesterday' : 'Earlier';
}

export default function AlertsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const alerts = useAlerts();
  const { lastSeen, markAllSeen } = useLastSeen();
  const loaded = useMemo(
    () => alerts.data?.pages.flatMap((page) => page.items) ?? [],
    [alerts.data],
  );
  const total = alerts.data?.pages[0]?.total ?? 0;

  const shown = loaded.filter((alert) => {
    if (filter === 'new') return isNewAlert(alert, lastSeen);
    if (filter === 'sla') return alert.type.startsWith('SLA_');
    if (filter === 'changes') return !alert.type.startsWith('SLA_');
    return true;
  });

  let body;
  if (alerts.isPending) {
    body = (
      <div className="flex flex-col gap-4 p-5" aria-busy="true">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  } else if (alerts.isError) {
    body = <QueryError error={alerts.error} onRetry={() => void alerts.refetch()} />;
  } else if (shown.length === 0) {
    body = (
      <EmptyState
        icon={Inbox}
        title="You are all caught up"
        description="New SLA warnings and incident changes will show up here."
      />
    );
  } else {
    let lastHeading = '';
    body = shown.map((alert) => {
      const group = heading(alert);
      const showHeading = group !== lastHeading;
      lastHeading = group;
      const { label, ink } = alertLabel(alert.type);
      const fresh = isNewAlert(alert, lastSeen);
      return (
        <div key={alert.id}>
          {showHeading && (
            <h2 className="border-t border-line bg-sunken px-5 pt-3.5 pb-2 text-[11px] font-semibold tracking-wide text-ink3 uppercase first:border-t-0">
              {group}
            </h2>
          )}
          <Link
            to={alertLink(alert)}
            className="flex gap-3.5 border-t border-line px-5 py-4 hover:bg-sunken"
          >
            <AlertIcon type={alert.type} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className={`text-xs font-semibold ${ink}`}>{label}</p>
              <p className="text-sm text-ink">{alert.message}</p>
              {alert.incidentId && (
                <code className="self-start rounded-md border border-line bg-sunken px-2 py-0.5 font-mono text-xs text-ink2">
                  {alert.incidentId.slice(0, 8)}
                </code>
              )}
            </div>
            <div className="flex shrink-0 items-start gap-2.5 pt-0.5">
              <DateTime value={alert.createdAt} format="relative" className="text-xs text-ink3" />
              {fresh && (
                <span className="mt-1 size-2 rounded-full bg-acc">
                  <span className="sr-only">New</span>
                </span>
              )}
            </div>
          </Link>
        </div>
      );
    });
  }

  return (
    <div className="flex max-w-265 flex-col gap-5">
      <PageHeader
        title="Alerts"
        description="SLA warnings and changes on incidents you are part of."
        actions={
          <Button onClick={markAllSeen}>
            <CheckCheck aria-hidden="true" />
            Mark all as seen
          </Button>
        }
      />
      <InlineAlert tone="info">
        <b>Email delivery is not switched on yet.</b> Alerts appear here and on the bell icon only.
      </InlineAlert>
      <SegmentedControl
        label="Alert type"
        options={FILTERS}
        value={filter}
        onValueChange={setFilter}
        className="self-start"
      />
      <Card className="overflow-hidden">
        {body}
        {!alerts.isPending && !alerts.isError && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sunken px-5 py-3">
            <p className="text-label text-ink3">
              Showing {shown.length} of {total} alerts
              {filter !== 'all' && alerts.hasNextPage ? ', from those loaded so far' : ''}
            </p>
            {alerts.hasNextPage && (
              <Button
                size="sm"
                loading={alerts.isFetchingNextPage}
                onClick={() => void alerts.fetchNextPage()}
              >
                Load more
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
