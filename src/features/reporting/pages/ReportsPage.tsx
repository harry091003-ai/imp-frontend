import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  LEVEL_LABELS,
  SEVERITIES,
  type IncidentStatus,
  type Severity,
} from '@/shared/lib/constants/domain';
import { ROUTES } from '@/shared/lib/constants/routes';
import { formatDuration } from '@/shared/lib/date';
import {
  Card,
  createDataTableColumns,
  DataTable,
  DateTime,
  EmptyState,
  PageHeader,
  Pagination,
  QueryError,
  SegmentedControl,
  Select,
  SeverityBadge,
  Skeleton,
  StatCard,
  StatusPill,
} from '@/shared/ui';
import { ServiceBars, serviceLabel, TrendChart } from '../components/Charts';
import { useMetrics, useReportRows, useTopServices, useTrends } from '../hooks';
import type { Metrics, ReportRow } from '../types';

type Range = '7' | '30' | '90';
const ALL = 'ALL';
const PAGE_SIZE = 10;
const EMPTY_ROWS: ReportRow[] = [];

const duration = (value: number | null) => (value == null ? '—' : formatDuration(value));

const helper = createDataTableColumns<ReportRow>();
const COLUMNS = helper.columns([
  helper.accessor('title', {
    header: 'Incident',
    cell: ({ row: { original } }) => (
      <div className="min-w-56">
        <Link
          to={ROUTES.incident(original.incidentId)}
          className="font-semibold text-ink hover:underline"
        >
          {original.title}
        </Link>
        <code className="mt-0.5 block font-mono text-xs text-ink3">
          {original.incidentId.slice(0, 8)}
        </code>
      </div>
    ),
  }),
  helper.accessor('severity', {
    header: 'Severity',
    cell: (info) => <SeverityBadge severity={info.getValue()} />,
  }),
  helper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusPill status={info.getValue()} />,
  }),
  helper.accessor('serviceName', {
    header: 'Service',
    cell: (info) => {
      const value = info.getValue();
      return (
        <span className="whitespace-nowrap text-label text-ink2">
          {value ? serviceLabel(value) : '—'}
        </span>
      );
    },
  }),
  helper.accessor('timeToAssignSeconds', {
    header: 'To assign',
    cell: (info) => <span className="text-label tabular-nums">{duration(info.getValue())}</span>,
  }),
  helper.accessor('resolutionTimeSeconds', {
    header: 'To resolve',
    cell: (info) => <span className="text-label tabular-nums">{duration(info.getValue())}</span>,
  }),
  helper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => (
      <DateTime
        value={info.getValue()}
        format="date"
        className="whitespace-nowrap text-label text-ink3"
      />
    ),
  }),
]);

function SlaRow({ label, total, breached }: { label: string; total: number; breached: number }) {
  const met = Math.max(total - breached, 0);
  const share = total > 0 ? (met / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-label font-medium text-ink">{label}</span>
        <b className="text-xl font-semibold text-ink tabular-nums">
          {total > 0 ? `${share.toFixed(1)}%` : '—'}
        </b>
      </div>
      <div aria-hidden="true" className="h-2 rounded-sm bg-critbg">
        <div className="h-2 rounded-sm bg-s-res" style={{ width: `${String(share)}%` }} />
      </div>
      <span className="text-xs text-ink3 tabular-nums">
        {met} of {total} met, {breached} breached
      </span>
    </div>
  );
}

function SlaPerformance({ metrics }: { metrics: Metrics }) {
  return (
    <>
      <SlaRow
        label="Assignment"
        total={metrics.totalIncidents}
        breached={metrics.assignmentSLA_BreachedCount}
      />
      <SlaRow
        label="Resolution"
        total={metrics.totalIncidents}
        breached={metrics.resolutionSLA_BreachedCount}
      />
    </>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState<Range>('30');
  const [status, setStatus] = useState<IncidentStatus>();
  const [severity, setSeverity] = useState<Severity>();
  const [page, setPage] = useState(0);
  const days = Number(range);
  const metrics = useMetrics();
  const trends = useTrends(days);
  const services = useTopServices();
  const rows = useReportRows({ page, size: PAGE_SIZE, status, severity });
  const data = metrics.data;
  const breaches = useMemo(
    () => (data ? data.assignmentSLA_BreachedCount + data.resolutionSLA_BreachedCount : 0),
    [data],
  );

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader
        title="Reports"
        description="How incidents are trending and how well the team keeps to its SLAs."
        actions={
          <SegmentedControl
            label="Date range"
            value={range}
            onValueChange={setRange}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
            ]}
          />
        }
      />

      {metrics.isError ? (
        <Card>
          <QueryError error={metrics.error} onRetry={() => void metrics.refetch()} />
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatCard
            label="Total incidents"
            value={data?.totalIncidents}
            hint={`${String(data?.openIncidents ?? 0)} open, ${String(data?.resolvedIncidents ?? 0)} resolved`}
            loading={metrics.isPending}
          />
          <StatCard
            label="Avg time to assign"
            value={duration(data?.avgAssignmentTime ?? null)}
            hint="Across all incidents"
            loading={metrics.isPending}
          />
          <StatCard
            label="Avg time to resolve"
            value={duration(data?.avgResolutionTime ?? null)}
            hint="Across resolved incidents"
            loading={metrics.isPending}
          />
          <StatCard
            label="SLA breaches"
            value={<span className={breaches > 0 ? 'text-crit' : undefined}>{breaches}</span>}
            hint={`${String(data?.assignmentSLA_BreachedCount ?? 0)} assignment, ${String(data?.resolutionSLA_BreachedCount ?? 0)} resolution`}
            loading={metrics.isPending}
          />
        </div>
      )}

      <div className="flex flex-wrap items-stretch gap-4">
        <TrendChart
          kind="bar"
          points={trends.data}
          days={days}
          loading={trends.isPending}
          error={trends.error}
          onRetry={() => void trends.refetch()}
          action={
            <span className="inline-flex items-center gap-2 text-xs text-ink3">
              <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-acc" />
              Busiest day
            </span>
          }
        />
        <Card className="flex min-w-0 flex-1 basis-80 flex-col gap-4.5 p-5">
          <div>
            <h2 className="text-base font-semibold text-ink">SLA performance</h2>
            <p className="mt-1 text-label text-ink3">Share of incidents that met their deadline</p>
          </div>
          {metrics.isPending && <Skeleton className="h-24 rounded-input" />}
          {data && <SlaPerformance metrics={data} />}
          <div className="flex flex-col gap-3.5 border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink">Services failing most</h3>
            {services.isPending && <Skeleton className="h-24 rounded-input" />}
            {services.isError && (
              <QueryError error={services.error} onRetry={() => void services.refetch()} />
            )}
            {services.data && <ServiceBars rows={services.data} limit={4} />}
          </div>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Incident reports</h2>
            <p className="mt-1 text-label text-ink3">Timing for every incident, oldest first.</p>
          </div>
          <div className="flex flex-wrap gap-2.5 max-md:w-full max-md:[&>*]:w-full">
            <Select<IncidentStatus | typeof ALL>
              aria-label="Filter by status"
              className="md:w-44"
              value={status ?? ALL}
              onValueChange={(value) => {
                setStatus(value === ALL ? undefined : value);
                setPage(0);
              }}
              options={[
                { value: ALL, label: 'All statuses' },
                ...INCIDENT_STATUSES.map((value) => ({
                  value,
                  label: INCIDENT_STATUS_LABELS[value],
                })),
              ]}
            />
            <Select<Severity | typeof ALL>
              aria-label="Filter by severity"
              className="md:w-44"
              value={severity ?? ALL}
              onValueChange={(value) => {
                setSeverity(value === ALL ? undefined : value);
                setPage(0);
              }}
              options={[
                { value: ALL, label: 'All severities' },
                ...SEVERITIES.map((value) => ({ value, label: LEVEL_LABELS[value] })),
              ]}
            />
          </div>
        </div>
        <DataTable
          caption="Incident reports"
          columns={COLUMNS}
          data={rows.data?.content ?? EMPTY_ROWS}
          getRowId={(row) => row.incidentId}
          loading={rows.isPending}
          refreshing={rows.isPlaceholderData}
          error={
            rows.isError ? (
              <QueryError error={rows.error} onRetry={() => void rows.refetch()} />
            ) : undefined
          }
          empty={<EmptyState title="No incidents match these filters" />}
          renderMobileCard={(row) => (
            <Link to={ROUTES.incident(row.incidentId)} className="flex flex-col gap-2">
              <span className="font-semibold text-ink">{row.title}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={row.severity} />
                <StatusPill status={row.status} />
              </span>
              <span className="text-xs text-ink3 tabular-nums">
                To assign {duration(row.timeToAssignSeconds)}, to resolve{' '}
                {duration(row.resolutionTimeSeconds)}
              </span>
            </Link>
          )}
          footer={
            rows.data && (
              <Pagination
                page={rows.data.number}
                pageSize={rows.data.size}
                totalPages={rows.data.totalPages}
                totalElements={rows.data.totalElements}
                disabled={rows.isPlaceholderData}
                onPageChange={setPage}
              />
            )
          }
        />
      </section>
    </div>
  );
}
