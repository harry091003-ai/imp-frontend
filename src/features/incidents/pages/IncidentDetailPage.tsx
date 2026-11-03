import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, ChevronRight, Copy, Pencil, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { Person, useUserNames } from '@/features/users';
import { backendSupports } from '@/shared/lib/api/capabilities';
import { cn } from '@/shared/lib/cn';
import { CATEGORY_LABELS, ENVIRONMENT_LABELS, SERVICE_LABELS } from '@/shared/lib/constants/domain';
import { ROUTES } from '@/shared/lib/constants/routes';
import { applyServerFieldErrors } from '@/shared/lib/forms';
import { toApiError } from '@/shared/lib/http/errors';
import { useCurrentUser } from '@/shared/lib/session';
import {
  Button,
  Card,
  DateTime,
  EmptyState,
  Field,
  IconButton,
  InlineAlert,
  Menu,
  QueryError,
  SeverityBadge,
  Skeleton,
  StatusPill,
  Textarea,
  TraceReference,
  useToast,
} from '@/shared/ui';
import { AiSuggestionPanel } from '../components/AiSuggestionPanel';
import { AssignDialog } from '../components/AssignDialog';
import { EditIncidentDialog } from '../components/EditIncidentDialog';
import { IncidentSlaBadge } from '../components/IncidentSlaBadge';
import { isFinished, NEXT_STATUSES, STEPS, type StatusOption } from '../components/statusFlow';
import { useAudit, useChangeStatus, useIncident, useSla } from '../hooks';
import { resolutionSchema, type Incident, type ResolutionInput } from '../types';

function Stepper({ incident }: { incident: Incident }) {
  return (
    <Card className="overflow-x-auto px-6 py-5.5">
      <ol className="flex min-w-120 items-start">
        {STEPS.map((step, index) => {
          const reached = step.reachedBy.includes(incident.incidentStatus);
          const current = reached && !STEPS[index + 1]?.reachedBy.includes(incident.incidentStatus);
          return (
            <li
              key={step.label}
              className="relative flex flex-1 flex-col items-center gap-2 text-center"
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-3.25 right-1/2 h-0.5 w-full',
                    reached ? 'bg-s-res' : 'bg-line',
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'relative flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                  reached ? 'bg-s-res text-surface' : 'bg-sunken text-ink3',
                  current && 'ring-4 ring-s-resbg',
                )}
              >
                {reached ? <Check className="size-4" /> : index + 1}
              </span>
              <span className={cn('text-label font-semibold', reached ? 'text-ink' : 'text-ink3')}>
                {step.label}
                {current && <span className="sr-only"> (current step)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Resolution({ incident }: { incident: Incident }) {
  const change = useChangeStatus(incident.id);
  const toast = useToast();
  const finished = isFinished(incident.incidentStatus);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResolutionInput>({
    resolver: zodResolver(resolutionSchema),
    values: {
      rootCause: incident.rootCause ?? '',
      resolutionNotes: incident.resolutionNotes ?? '',
    },
  });
  const rootCause = useWatch({ control, name: 'rootCause' });
  const notes = useWatch({ control, name: 'resolutionNotes' });
  const failure = change.error ? toApiError(change.error) : null;

  if (finished) {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-base font-semibold text-ink">Root cause and resolution</h2>
        <div>
          <h3 className="text-label font-medium text-ink">Root cause</h3>
          <p className="mt-1 whitespace-pre-wrap text-ink2">{incident.rootCause ?? '—'}</p>
        </div>
        <div>
          <h3 className="text-label font-medium text-ink">Resolution notes</h3>
          <p className="mt-1 whitespace-pre-wrap text-ink2">{incident.resolutionNotes ?? '—'}</p>
        </div>
      </Card>
    );
  }

  const onSubmit = handleSubmit((values) => {
    change.mutate(
      { status: 'RESOLVED', ...values },
      {
        onSuccess: () => {
          toast({
            title: 'Incident resolved',
            description: 'These notes teach the AI for next time.',
          });
        },
        onError: (error) => {
          applyServerFieldErrors(
            toApiError(error).fieldErrors,
            ['rootCause', 'resolutionNotes'],
            setError,
          );
        },
      },
    );
  });

  return (
    <Card className="p-6">
      <form noValidate className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Root cause and resolution</h2>
          <span className="text-xs text-ink3">Required before you can resolve</span>
        </div>
        {failure && (
          <InlineAlert tone="error">
            {failure.message}
            {failure.traceId && <TraceReference traceId={failure.traceId} className="mt-1 flex" />}
          </InlineAlert>
        )}
        <Field
          label="Root cause"
          count={rootCause.length}
          maxLength={2000}
          error={errors.rootCause?.message}
        >
          {(aria) => (
            <Textarea
              {...aria}
              {...register('rootCause')}
              placeholder="What actually went wrong?"
            />
          )}
        </Field>
        <Field
          label="Resolution notes"
          count={notes.length}
          maxLength={2000}
          error={errors.resolutionNotes?.message}
        >
          {(aria) => (
            <Textarea
              {...aria}
              {...register('resolutionNotes')}
              placeholder="What did you do to fix it?"
            />
          )}
        </Field>
        <div>
          <Button type="submit" variant="primary" loading={change.isPending}>
            Resolve incident
          </Button>
        </div>
      </form>
    </Card>
  );
}

const AUDIT_TEXT: Record<string, string> = {
  INCIDENT_CREATED: 'reported this incident',
  INCIDENT_ASSIGNED: 'assigned this incident',
  INCIDENT_STATUS_UPDATED: 'changed the status',
  INCIDENT_METADATA_UPDATED: 'edited the details',
};

function Activity({ incident }: { incident: Incident }) {
  const user = useCurrentUser();
  const allowed = user.role !== 'ROLE_ENGINEER' || backendSupports('engineerActivity');
  const audit = useAudit(incident.id, allowed);
  const rows = useMemo(
    () =>
      [...(audit.data ?? [])].sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? '')),
    [audit.data],
  );
  const names = useUserNames(useMemo(() => rows.map((row) => row.performedBy), [rows]));

  if (!allowed) return null;

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-base font-semibold text-ink">Activity</h2>
      {audit.isPending && <Skeleton className="h-16 rounded-input" />}
      {audit.isError && <QueryError error={audit.error} onRetry={() => void audit.refetch()} />}
      {audit.isSuccess && rows.length === 0 && (
        <p className="text-ink2">
          No activity recorded yet. New events can take a moment to appear.
        </p>
      )}
      <ol className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.eventId} className="flex flex-col gap-0.5">
            <p className="text-sm text-ink">
              <b className="font-semibold">
                {row.performedBy
                  ? (names.get(row.performedBy) ?? row.performedBy.slice(0, 8))
                  : 'The system'}
              </b>{' '}
              {AUDIT_TEXT[row.eventType] ?? row.eventType.toLowerCase().replace(/_/g, ' ')}
              {row.eventType === 'INCIDENT_STATUS_UPDATED' && row.newValue && ` to ${row.newValue}`}
            </p>
            <DateTime value={row.timestamp} format="relative" className="text-xs text-ink3" />
          </li>
        ))}
      </ol>
    </Card>
  );
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      label={copied ? 'Incident ID copied' : 'Copy incident ID'}
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(id).then(() => {
          setCopied(true);
        });
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </IconButton>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-label">
      <dt className="shrink-0 text-ink3">{label}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  );
}

export default function IncidentDetailPage() {
  const { id = '' } = useParams();
  const user = useCurrentUser();
  const toast = useToast();
  const query = useIncident(id);
  const change = useChangeStatus(id);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const incident = query.data;
  const loaded = incident !== undefined;
  // A "Resolve" link lands here with #resolution, but the form only exists once the data arrives.
  useEffect(() => {
    if (loaded && location.hash === '#resolution') {
      document.getElementById('resolution')?.scrollIntoView();
    }
  }, [loaded]);
  const sla = useSla(useMemo(() => (incident ? [incident.id] : []), [incident]));
  const names = useUserNames(
    useMemo(
      () => (incident ? [incident.createdBy, incident.assignedTo, incident.assignedBy] : []),
      [incident],
    ),
  );

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }
  if (query.isError) {
    const failure = toApiError(query.error);
    return failure.status === 404 ? (
      <EmptyState
        title="Incident not found"
        description="It may have been removed, or the link may be wrong."
        action={
          <Button asChild>
            <Link to={ROUTES.incidents}>Back to incidents</Link>
          </Button>
        }
      />
    ) : (
      <QueryError error={query.error} onRetry={() => void query.refetch()} />
    );
  }
  if (!incident) return null;

  const pick = (option: StatusOption) => {
    if (option.status === 'RESOLVED') {
      document.getElementById('resolution')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    change.mutate(
      { status: option.status },
      {
        onSuccess: () => {
          toast({ title: `${option.label}: done` });
        },
        onError: (error) => {
          const failure = toApiError(error);
          toast({
            title: 'Could not change the status',
            description: failure.message,
            tone: 'error',
            traceId: failure.traceId,
          });
        },
      },
    );
  };

  const canAssign = user.role !== 'ROLE_ENGINEER' && !isFinished(incident.incidentStatus);
  const options = NEXT_STATUSES[incident.incidentStatus];

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-label text-ink3">
        <Link to={ROUTES.incidents} className="font-medium hover:underline">
          Incidents
        </Link>
        <ChevronRight aria-hidden="true" className="size-3.5" />
        <code className="font-mono text-ink2">{incident.id.slice(0, 8)}</code>
        <CopyId id={incident.id} />
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 flex-1 basis-120 flex-col gap-3">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-ink">
            {incident.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusPill status={incident.incidentStatus} />
            <span className="text-label text-ink3">
              Reported <DateTime value={incident.createdAt} format="relative" />
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canAssign && (
            <Button
              onClick={() => {
                setAssignOpen(true);
              }}
            >
              <UserPlus aria-hidden="true" />
              {incident.assignedTo ? 'Reassign' : 'Assign'}
            </Button>
          )}
          <Button
            onClick={() => {
              setEditOpen(true);
            }}
          >
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          <Menu
            trigger={
              <Button variant="primary" loading={change.isPending}>
                Change status
                <ChevronDown aria-hidden="true" />
              </Button>
            }
            items={options.map((option) => ({
              label: option.label,
              onSelect: () => {
                pick(option);
              },
            }))}
          />
        </div>
      </div>

      <Stepper incident={incident} />

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-1 basis-155 flex-col gap-5">
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-base font-semibold text-ink">Description</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink2">
              {incident.description ?? '—'}
            </p>
          </Card>
          <div id="resolution" className="scroll-mt-20">
            <Resolution incident={incident} />
          </div>
          <Activity incident={incident} />
        </div>

        <div className="flex min-w-0 flex-1 basis-75 flex-col gap-5">
          {backendSupports('slaData') && (
            <Card className="flex flex-col gap-2.5 p-5">
              <h2 className="text-sm font-semibold text-ink">SLA</h2>
              <IncidentSlaBadge sla={sla.get(incident.id)} className="self-start" />
              <dl className="flex flex-col gap-2">
                <Row label="Assign by">
                  <DateTime value={sla.get(incident.id)?.assignmentDeadline} />
                </Row>
                <Row label="Resolve by">
                  <DateTime value={sla.get(incident.id)?.resolutionDeadline} />
                </Row>
              </dl>
            </Card>
          )}
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-semibold text-ink">Details</h2>
            <dl className="flex flex-col gap-2.5">
              <Row label="Assignee">
                <Person id={incident.assignedTo} names={names} />
              </Row>
              <Row label="Reporter">
                <Person id={incident.createdBy} names={names} />
              </Row>
              <Row label="Service">
                {incident.serviceName ? SERVICE_LABELS[incident.serviceName] : '—'}
              </Row>
              <Row label="Category">
                {incident.category ? CATEGORY_LABELS[incident.category] : '—'}
              </Row>
              <Row label="Environment">
                {incident.environment ? ENVIRONMENT_LABELS[incident.environment] : '—'}
              </Row>
              <Row label="Location">{incident.location || '—'}</Row>
              <Row label="Affected source">{incident.affectedSource || '—'}</Row>
              <Row label="Last updated">
                <DateTime value={incident.updatedAt} format="relative" />
              </Row>
            </dl>
          </Card>
          <AiSuggestionPanel
            input={{
              title: incident.title,
              description: incident.description ?? incident.title,
              category: incident.category,
              serviceName: incident.serviceName,
            }}
          />
        </div>
      </div>

      {canAssign && (
        <AssignDialog incident={incident} open={assignOpen} onOpenChange={setAssignOpen} />
      )}
      {editOpen && <EditIncidentDialog incident={incident} open onOpenChange={setEditOpen} />}
    </div>
  );
}
