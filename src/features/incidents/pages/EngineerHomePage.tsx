import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertIcon, alertLink, useLatestAlerts, useNewAlertCount } from '@/features/notifications';
import { backendSupports } from '@/shared/lib/api/capabilities';
import { ENVIRONMENT_LABELS, SERVICE_LABELS } from '@/shared/lib/constants/domain';
import { ROUTES } from '@/shared/lib/constants/routes';
import { parseBackendDate } from '@/shared/lib/date';
import { toApiError } from '@/shared/lib/http/errors';
import {
  Button,
  Card,
  DateTime,
  EmptyState,
  QueryError,
  SegmentedControl,
  SeverityBadge,
  Skeleton,
  StatCard,
  StatusPill,
  useToast,
} from '@/shared/ui';
import { IncidentSlaBadge } from '../components/IncidentSlaBadge';
import { isFinished } from '../components/statusFlow';
import { useChangeStatus, useIncidents, useSla } from '../hooks';
import type { Incident, IncidentSla } from '../types';

const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const HOUR_MS = 3_600_000;

function deadlineOf(sla: IncidentSla | undefined): number {
  const deadline = parseBackendDate(sla?.resolutionDeadline);
  return deadline ? deadline.getTime() : Number.POSITIVE_INFINITY;
}

/** With SLA data, the closest deadline first. Without it (BCR-07), the highest severity first. */
function urgencyOrder(sla: ReadonlyMap<string, IncidentSla>) {
  return (a: Incident, b: Incident) =>
    deadlineOf(sla.get(a.id)) - deadlineOf(sla.get(b.id)) ||
    SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

function QueueRow({ incident, sla }: { incident: Incident; sla: IncidentSla | undefined }) {
  const change = useChangeStatus(incident.id);
  const toast = useToast();
  const canStart = incident.incidentStatus !== 'IN_PROGRESS';

  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3.5">
      <div className="min-w-0 flex-1 basis-60">
        <Link to={ROUTES.incident(incident.id)} className="font-semibold text-ink hover:underline">
          {incident.title}
        </Link>
        <p className="mt-0.5 text-xs text-ink3">
          <code className="font-mono">{incident.id.slice(0, 8)}</code>
          {incident.serviceName && ` · ${SERVICE_LABELS[incident.serviceName]}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={incident.severity} />
        <StatusPill status={incident.incidentStatus} />
        {backendSupports('slaData') && <IncidentSlaBadge sla={sla} />}
      </div>
      {canStart ? (
        <Button
          size="sm"
          loading={change.isPending}
          onClick={() => {
            change.mutate(
              { status: 'IN_PROGRESS' },
              {
                onError: (error) => {
                  const failure = toApiError(error);
                  toast({
                    title: 'Could not start work',
                    description: failure.message,
                    tone: 'error',
                    traceId: failure.traceId,
                  });
                },
              },
            );
          }}
        >
          Start work
        </Button>
      ) : (
        <Button asChild size="sm" variant="primary">
          <Link to={`${ROUTES.incident(incident.id)}#resolution`}>Resolve</Link>
        </Button>
      )}
    </li>
  );
}

export default function EngineerHomePage() {
  const [queueFilter, setQueueFilter] = useState<'all' | 'active' | 'waiting'>('all');
  const assigned = useIncidents({ page: 0, size: 100, filter: 'assignedToMe' });
  const created = useIncidents({ page: 0, size: 1, filter: 'createdByMe' });
  const alerts = useLatestAlerts(3);
  const newAlerts = useNewAlertCount();

  const open = useMemo(
    () => (assigned.data?.content ?? []).filter((row) => !isFinished(row.incidentStatus)),
    [assigned.data],
  );
  const sla = useSla(useMemo(() => open.map((row) => row.id), [open]));
  const queue = useMemo(() => [...open].sort(urgencyOrder(sla)), [open, sla]);
  const urgent = queue[0];
  const dueSoon = queue.filter((row) => {
    const left = deadlineOf(sla.get(row.id)) - Date.now();
    return left > 0 && left <= HOUR_MS;
  }).length;
  const shown = queue.filter((row) => {
    if (queueFilter === 'active') return row.incidentStatus === 'IN_PROGRESS';
    if (queueFilter === 'waiting') return row.incidentStatus !== 'IN_PROGRESS';
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">{greeting()}</h1>
        <p className="mt-1.5 text-[15px] text-ink3">
          {assigned.isPending
            ? 'Loading your work.'
            : `You have ${String(open.length)} open ${open.length === 1 ? 'incident' : 'incidents'} assigned to you.`}{' '}
          You see incidents you reported or were assigned.
        </p>
      </div>

      {assigned.isPending && <Skeleton className="h-40 rounded-card" />}
      {assigned.isError && (
        <Card>
          <QueryError error={assigned.error} onRetry={() => void assigned.refetch()} />
        </Card>
      )}
      {urgent && (
        <Card className="flex flex-col gap-3.5 p-7">
          <span className="text-[11px] font-semibold tracking-wide text-high uppercase">
            Most urgent
          </span>
          <h2 className="text-2xl leading-tight font-semibold tracking-tight text-ink">
            {urgent.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={urgent.severity} />
            <StatusPill status={urgent.incidentStatus} />
            {backendSupports('slaData') && <IncidentSlaBadge sla={sla.get(urgent.id)} />}
            <span className="text-label text-ink3">
              {[
                urgent.serviceName && SERVICE_LABELS[urgent.serviceName],
                urgent.environment && ENVIRONMENT_LABELS[urgent.environment],
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2.5">
            <Button asChild variant="primary">
              <Link to={ROUTES.incident(urgent.id)}>Open incident</Link>
            </Button>
            <Button asChild>
              <Link to={`${ROUTES.incident(urgent.id)}#resolution`}>Resolve with notes</Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatCard label="Assigned to me" value={open.length} loading={assigned.isPending} />
        {backendSupports('slaData') && (
          <StatCard label="Due within 1 hour" value={dueSoon} loading={assigned.isPending} />
        )}
        <StatCard
          label="Created by me"
          value={created.data?.totalElements ?? 0}
          loading={created.isPending}
        />
        <StatCard label="New alerts" value={newAlerts} loading={alerts.isPending} />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-1 basis-150 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4.5 pb-3.5">
            <div>
              <h2 className="text-base font-semibold text-ink">My queue</h2>
              <p className="mt-1 text-label text-ink3">
                {backendSupports('slaData')
                  ? 'Sorted by SLA deadline, closest first'
                  : 'Sorted by severity, highest first'}
              </p>
            </div>
            <SegmentedControl
              label="Queue filter"
              value={queueFilter}
              onValueChange={setQueueFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'In progress' },
                { value: 'waiting', label: 'Not started' },
              ]}
            />
          </div>
          {assigned.isSuccess && shown.length === 0 ? (
            <EmptyState title="Nothing here" description="No open incidents match this filter." />
          ) : (
            <ul>
              {shown.map((incident) => (
                <QueueRow key={incident.id} incident={incident} sla={sla.get(incident.id)} />
              ))}
            </ul>
          )}
        </Card>

        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-5">
          <Card className="flex flex-col p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Alerts for you</h2>
              <Link to={ROUTES.alerts} className="text-label font-medium text-acc hover:underline">
                View all
              </Link>
            </div>
            {alerts.isPending && <Skeleton className="h-12" />}
            {alerts.isError && <QueryError error={alerts.error} />}
            {alerts.data?.items.length === 0 && (
              <p className="py-3 text-ink2">You are all caught up.</p>
            )}
            {alerts.data?.items.map((alert) => (
              <Link
                key={alert.id}
                to={alertLink(alert)}
                className="flex gap-3 border-t border-line py-2.5 hover:bg-sunken"
              >
                <AlertIcon type={alert.type} size="sm" />
                <span className="min-w-0">
                  <span className="block text-label text-ink">{alert.message}</span>
                  <DateTime
                    value={alert.createdAt}
                    format="relative"
                    className="text-xs text-ink3"
                  />
                </span>
              </Link>
            ))}
          </Card>
          <Card className="flex flex-col gap-3 border-accline bg-accbg p-5 shadow-none">
            <h2 className="text-base font-semibold text-acc">See something broken?</h2>
            <p className="text-label leading-relaxed text-ink2">
              Report it in a minute. AI can suggest a likely cause from past incidents.
            </p>
            <Button asChild variant="primary" className="self-start">
              <Link to={ROUTES.newIncident}>Report an incident</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
