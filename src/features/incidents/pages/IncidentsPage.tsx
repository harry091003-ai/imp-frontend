import { Plus, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Person, useUserNames } from '@/features/users';
import { backendSupports } from '@/shared/lib/api/capabilities';
import {
  ENVIRONMENT_LABELS,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  LEVEL_LABELS,
  SERVICE_LABELS,
  SEVERITIES,
  type IncidentStatus,
  type Severity,
} from '@/shared/lib/constants/domain';
import { ROUTES } from '@/shared/lib/constants/routes';
import { useCurrentUser } from '@/shared/lib/session';
import {
  Button,
  createDataTableColumns,
  DataTable,
  DateTime,
  EmptyState,
  FilterBar,
  PageHeader,
  Pagination,
  QueryError,
  SearchInput,
  Select,
  SeverityBadge,
  StatusPill,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { IncidentSlaBadge } from '../components/IncidentSlaBadge';
import { useIncidents, useSla } from '../hooks';
import type { Incident, IncidentScope, IncidentSla } from '../types';

const PAGE_SIZE = 20;
const ALL = 'ALL';

function subtitle(incident: Incident): string {
  return [
    incident.serviceName ? SERVICE_LABELS[incident.serviceName] : null,
    incident.environment ? ENVIRONMENT_LABELS[incident.environment] : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function IncidentsPage() {
  const user = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const scope = (params.get('scope') ?? ALL) as IncidentScope | typeof ALL;
  const status = params.get('status') as IncidentStatus | null;
  const severity = params.get('severity') as Severity | null;
  const page = Number(params.get('page') ?? 0);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const canFilter = backendSupports('incidentFilters');
  const isManager = user.role !== 'ROLE_ENGINEER';

  /** The URL holds the filters, so a link or reload keeps them. Any change returns to page one. */
  function update(next: Record<string, string | null>) {
    setParams((current) => {
      const merged = new URLSearchParams(current);
      merged.delete('page');
      Object.entries(next).forEach(([key, value]) => {
        if (value === null) merged.delete(key);
        else merged.set(key, value);
      });
      return merged;
    });
  }

  // Waits for a pause in typing, so each key press does not send a request.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (params.get('q') ?? '')) update({ q: search || null });
    }, 300);
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a change in the text should trigger this
  }, [search]);

  const query = useIncidents({
    page,
    size: PAGE_SIZE,
    filter: scope === ALL ? undefined : scope,
    status: canFilter ? (status ?? undefined) : undefined,
    severity: canFilter ? (severity ?? undefined) : undefined,
    q: canFilter ? params.get('q') || undefined : undefined,
  });
  const rows = query.data?.content;
  const ids = useMemo(() => (rows ?? []).map((row) => row.id), [rows]);
  const sla = useSla(ids);
  const names = useUserNames(useMemo(() => (rows ?? []).map((row) => row.assignedTo), [rows]));
  const activeFilters = [status, severity, params.get('q')].filter(Boolean).length;

  const columns = useMemo(() => buildColumns(names, sla), [names, sla]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Incidents"
        description={
          isManager
            ? 'Everything you can see, newest first.'
            : 'Incidents you reported or were assigned, newest first.'
        }
        actions={
          <Button asChild variant="primary" className="lg:hidden">
            <Link to={ROUTES.newIncident}>
              <Plus aria-hidden="true" />
              New incident
            </Link>
          </Button>
        }
      />

      <Tabs
        value={scope}
        onValueChange={(value) => {
          update({ scope: value === ALL ? null : value });
        }}
      >
        <TabsList aria-label="Incident scope">
          <TabsTrigger value={ALL}>All</TabsTrigger>
          <TabsTrigger value="assignedToMe">Assigned to me</TabsTrigger>
          <TabsTrigger value="createdByMe">Created by me</TabsTrigger>
          {isManager && <TabsTrigger value="assignedByMe">Assigned by me</TabsTrigger>}
        </TabsList>
        <TabsContent value={scope} className="flex flex-col gap-5">
          {canFilter && (
            <FilterBar
              activeCount={activeFilters}
              onClear={() => {
                setSearch('');
                update({ status: null, severity: null, q: null });
              }}
            >
              <SearchInput
                aria-label="Search incidents by title or ID"
                placeholder="Search by title or ID"
                className="md:w-72"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
              <Select<IncidentStatus | typeof ALL>
                aria-label="Filter by status"
                className="md:w-44"
                value={status ?? ALL}
                onValueChange={(value) => {
                  update({ status: value === ALL ? null : value });
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
                  update({ severity: value === ALL ? null : value });
                }}
                options={[
                  { value: ALL, label: 'All severities' },
                  ...SEVERITIES.map((value) => ({ value, label: LEVEL_LABELS[value] })),
                ]}
              />
            </FilterBar>
          )}

          <DataTable
            caption="Incidents"
            columns={columns}
            data={rows ?? NO_ROWS}
            getRowId={(row) => row.id}
            loading={query.isPending}
            refreshing={query.isPlaceholderData}
            error={
              query.isError ? (
                <QueryError error={query.error} onRetry={() => void query.refetch()} />
              ) : undefined
            }
            empty={
              <EmptyState
                icon={SearchX}
                title={
                  activeFilters > 0 ? 'No incidents match these filters' : 'No incidents here yet'
                }
                description={
                  activeFilters > 0
                    ? 'Try a different status or severity, or clear the filters.'
                    : 'When an incident is reported, it will show up here.'
                }
              />
            }
            renderMobileCard={(row) => (
              <Link to={ROUTES.incident(row.id)} className="flex flex-col gap-2">
                <span className="font-semibold text-ink">{row.title}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <SeverityBadge severity={row.severity} />
                  <StatusPill status={row.incidentStatus} />
                  <IncidentSlaBadge sla={sla.get(row.id)} />
                </span>
                <span className="flex items-center justify-between gap-3">
                  <Person id={row.assignedTo} names={names} />
                  <DateTime value={row.createdAt} format="relative" className="text-xs text-ink3" />
                </span>
              </Link>
            )}
            footer={
              query.data && (
                <Pagination
                  page={query.data.number}
                  pageSize={query.data.size}
                  totalPages={query.data.totalPages}
                  totalElements={query.data.totalElements}
                  disabled={query.isPlaceholderData}
                  onPageChange={(next) => {
                    setParams((current) => {
                      const merged = new URLSearchParams(current);
                      merged.set('page', String(next));
                      return merged;
                    });
                  }}
                />
              )
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const NO_ROWS: Incident[] = [];

function buildColumns(names: ReadonlyMap<string, string>, sla: ReadonlyMap<string, IncidentSla>) {
  const helper = createDataTableColumns<Incident>();
  return helper.columns([
    helper.accessor('title', {
      header: 'Incident',
      cell: ({ row: { original } }) => (
        <div className="min-w-64">
          <Link
            to={ROUTES.incident(original.id)}
            className="font-semibold text-ink hover:underline"
          >
            {original.title}
          </Link>
          <p className="mt-0.5 text-xs text-ink3">
            <code className="font-mono">{original.id.slice(0, 8)}</code>
            {subtitle(original) && ` · ${subtitle(original)}`}
          </p>
        </div>
      ),
    }),
    helper.accessor('severity', {
      header: 'Severity',
      cell: (info) => <SeverityBadge severity={info.getValue()} />,
    }),
    helper.accessor('incidentStatus', {
      header: 'Status',
      cell: (info) => <StatusPill status={info.getValue()} />,
    }),
    helper.accessor('assignedTo', {
      header: 'Assignee',
      cell: (info) => <Person id={info.getValue()} names={names} />,
    }),
    ...(backendSupports('slaData')
      ? [
          helper.display({
            id: 'sla',
            header: 'SLA',
            cell: ({ row: { original } }) => <IncidentSlaBadge sla={sla.get(original.id)} />,
          }),
        ]
      : []),
    helper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => (
        <DateTime
          value={info.getValue()}
          format="relative"
          className="whitespace-nowrap text-label text-ink3"
        />
      ),
    }),
  ]);
}
