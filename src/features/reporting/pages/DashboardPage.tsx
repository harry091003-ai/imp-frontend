import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { IncidentSlaBadge, useIncidents, useSla } from '@/features/incidents';
import { AlertIcon, alertLink, useLatestAlerts } from '@/features/notifications';
import { Person, useUserNames } from '@/features/users';
import { backendSupports } from '@/shared/lib/api/capabilities';
import { SERVICE_LABELS } from '@/shared/lib/constants/domain';
import { ROUTES } from '@/shared/lib/constants/routes';
import { formatDuration, parseBackendDate } from '@/shared/lib/date';
import {
  Button,
  Card,
  DateTime,
  QueryError,
  SegmentedControl,
  SeverityBadge,
  Skeleton,
  StatCard,
} from '@/shared/ui';
import { ServiceBars, TrendChart } from '../components/Charts';
import { useMetrics, useTopServices, useTrends } from '../hooks';

type Range = '7' | '30' | '90';
const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const seconds = (value: number | null | undefined) => (value == null ? '—' : formatDuration(value));

function NeedsAttention() {
  // No "open only" filter exists yet (BCR-06), so this looks through the newest incidents.
  const incidents = useIncidents({ page: 0, size: 50 });
  const open = useMemo(
    () =>
      (incidents.data?.content ?? []).filter(
        (row) => row.incidentStatus !== 'RESOLVED' && row.incidentStatus !== 'CLOSED',
      ),
    [incidents.data],
  );
  const sla = useSla(useMemo(() => open.map((row) => row.id), [open]));
  const hasSla = backendSupports('slaData');
  const rows = useMemo(() => {
    const deadline = (id: string) => {
      const row = sla.get(id);
      const next = parseBackendDate(
        row?.assignedAt ? row.resolutionDeadline : row?.assignmentDeadline,
      );
      return next ? next.getTime() : Number.POSITIVE_INFINITY;
    };
    return [...open].sort((a, b) => deadline(a.id) - deadline(b.id)).slice(0, 5);
  }, [open, sla]);
  const names = useUserNames(useMemo(() => rows.map((row) => row.assignedTo), [rows]));

  return (
    <Card className="flex min-w-0 flex-2 basis-140 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-4.5 pb-3.5">
        <div>
          <h2 className="text-base font-semibold text-ink">
            {hasSla ? 'Needs attention' : 'Newest open incidents'}
          </h2>
          <p className="mt-1 text-label text-ink3">
            {hasSla
              ? 'Open incidents closest to their SLA deadline'
              : 'Most recently reported first'}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to={ROUTES.incidents}>View all</Link>
        </Button>
      </div>
      {incidents.isPending && <Skeleton className="m-5 h-32 rounded-input" />}
      {incidents.isError && (
        <QueryError error={incidents.error} onRetry={() => void incidents.refetch()} />
      )}
      {incidents.isSuccess && rows.length === 0 && (
        <p className="border-t border-line px-5 py-8 text-center text-ink2">
          No open incidents. Nothing needs attention.
        </p>
      )}
      <ul>
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3.5 hover:bg-sunken"
          >
            <div className="min-w-0 flex-1 basis-60">
              <Link
                to={ROUTES.incident(row.id)}
                className="block truncate font-semibold text-ink hover:underline"
              >
                {row.title}
              </Link>
              <p className="mt-0.5 text-xs text-ink3">
                <code className="font-mono">{row.id.slice(0, 8)}</code>
                {row.serviceName && ` · ${SERVICE_LABELS[row.serviceName]}`}
              </p>
            </div>
            <SeverityBadge severity={row.severity} />
            <Person id={row.assignedTo} names={names} className="w-36" />
            {hasSla && <IncidentSlaBadge sla={sla.get(row.id)} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LatestAlerts() {
  const alerts = useLatestAlerts(5);
  return (
    <Card className="flex min-w-0 flex-1 basis-80 flex-col p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Latest alerts</h2>
        <Link to={ROUTES.alerts} className="text-label font-medium text-acc hover:underline">
          View all
        </Link>
      </div>
      {alerts.isPending && <Skeleton className="h-24 rounded-input" />}
      {alerts.isError && <QueryError error={alerts.error} onRetry={() => void alerts.refetch()} />}
      {alerts.data?.items.length === 0 && <p className="py-4 text-ink2">You are all caught up.</p>}
      {alerts.data?.items.map((alert) => (
        <Link
          key={alert.id}
          to={alertLink(alert)}
          className="flex gap-3 border-t border-line py-2.5 hover:bg-sunken"
        >
          <AlertIcon type={alert.type} size="sm" />
          <span className="min-w-0">
            <span className="block text-label text-ink">{alert.message}</span>
            <DateTime value={alert.createdAt} format="relative" className="text-xs text-ink3" />
          </span>
        </Link>
      ))}
    </Card>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>('7');
  const days = Number(range);
  const metrics = useMetrics();
  const trends = useTrends(days);
  const services = useTopServices();
  const data = metrics.data;
  const breaches = data ? data.assignmentSLA_BreachedCount + data.resolutionSLA_BreachedCount : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1.5 text-[15px] text-ink3">
            {data
              ? `${String(data.openIncidents)} incidents are open. ${String(breaches)} SLA ${breaches === 1 ? 'breach' : 'breaches'} all time.`
              : 'How incidents and SLAs are doing.'}
          </p>
        </div>
        <SegmentedControl
          label="Date range"
          value={range}
          onValueChange={setRange}
          options={RANGES}
        />
      </div>

      {metrics.isError ? (
        <Card>
          <QueryError error={metrics.error} onRetry={() => void metrics.refetch()} />
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatCard
            label="Open incidents"
            value={data?.openIncidents}
            hint={`${String(data?.totalIncidents ?? 0)} total`}
            loading={metrics.isPending}
          />
          <StatCard
            label="Avg time to assign"
            value={seconds(data?.avgAssignmentTime)}
            hint="All time"
            loading={metrics.isPending}
          />
          <StatCard
            label="Avg time to resolve"
            value={seconds(data?.avgResolutionTime)}
            hint="All time"
            loading={metrics.isPending}
          />
          <StatCard
            label="SLA breaches"
            value={<span className={breaches > 0 ? 'text-crit' : undefined}>{breaches}</span>}
            hint={`${String(data?.assignmentSLA_BreachedCount ?? 0)} assign, ${String(data?.resolutionSLA_BreachedCount ?? 0)} resolve`}
            loading={metrics.isPending}
          />
        </div>
      )}

      <div className="flex flex-wrap items-stretch gap-4">
        <TrendChart
          kind="area"
          points={trends.data}
          days={days}
          loading={trends.isPending}
          error={trends.error}
          onRetry={() => void trends.refetch()}
        />
        <Card className="flex min-w-0 flex-1 basis-80 flex-col gap-4 p-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Services failing most</h2>
            <p className="mt-1 text-label text-ink3">Incidents per service, all time</p>
          </div>
          {services.isPending && <Skeleton className="h-40 rounded-input" />}
          {services.isError && (
            <QueryError error={services.error} onRetry={() => void services.refetch()} />
          )}
          {services.data?.length === 0 && <p className="text-ink2">No incidents reported yet.</p>}
          {services.data && <ServiceBars rows={services.data} />}
          <Link
            to={ROUTES.reports}
            className="mt-auto text-label font-medium text-acc hover:underline"
          >
            Open full report
          </Link>
        </Card>
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        <NeedsAttention />
        <LatestAlerts />
      </div>
    </div>
  );
}
