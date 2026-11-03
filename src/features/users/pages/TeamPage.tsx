import { useMemo, useState } from 'react';
import { backendSupports } from '@/shared/lib/api/capabilities';
import { USER_STATUS_LABELS, type UserStatus } from '@/shared/lib/constants/domain';
import { formatDuration } from '@/shared/lib/date';
import { toApiError } from '@/shared/lib/http/errors';
import { useCurrentUser } from '@/shared/lib/session';
import {
  Avatar,
  Card,
  DateTime,
  EmptyState,
  PageHeader,
  QueryError,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  StatCard,
  toOptions,
  UserStatusBadge,
  useToast,
} from '@/shared/ui';
import { useEngineers, useSetUserStatus, useSummaries, useWorkloads } from '../hooks';
import type { EngineerSummary, User, Workload } from '../types';

type Filter = 'ALL' | UserStatus;
const percent = (value: number) => `${String(Math.round(value * 100))}%`;
const BUSY_AT = 5;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-ink3">{label}</span>
      <b className="text-sm font-semibold text-ink tabular-nums">{value}</b>
    </div>
  );
}

interface EngineerCardProps {
  engineer: User;
  workload: Workload | undefined;
  summary: EngineerSummary | undefined;
}

function EngineerCard({ engineer, workload, summary }: EngineerCardProps) {
  const setStatus = useSetUserStatus();
  const toast = useToast();
  const active = workload?.activeIncidentCount ?? 0;

  return (
    <Card className="flex flex-col gap-4.5 p-5">
      <div className="flex items-center gap-3.5">
        <Avatar name={engineer.username} size="lg" />
        <div className="min-w-0 flex-1 leading-snug">
          <b className="text-base font-semibold text-ink">{engineer.username}</b>
          <p className="truncate font-mono text-xs text-ink3">{engineer.email}</p>
        </div>
        <UserStatusBadge status={engineer.status} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-label">
          <span className="font-medium text-ink">Active incidents</span>
          <span className="text-ink3 tabular-nums">{workload ? active : '—'}</span>
        </div>
        <div aria-hidden="true" className="flex gap-1">
          {Array.from({ length: BUSY_AT }, (_, index) => (
            <span
              key={index}
              className={`h-2 flex-1 rounded-sm ${index < active ? (active >= BUSY_AT ? 'bg-highdot' : 'bg-acc') : 'bg-sunken'}`}
            />
          ))}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Metric label="SLA success" value={percent(summary.slaSuccessRate)} />
          <Metric label="Avg resolve" value={formatDuration(summary.avgResolutionTimeSeconds)} />
          <Metric label="Expertise" value={percent(summary.expertiseScore)} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line pt-3.5">
        <Select<UserStatus>
          aria-label={`Set status for ${engineer.username}`}
          className="w-36"
          disabled={setStatus.isPending}
          value={engineer.status}
          options={toOptions<UserStatus>(USER_STATUS_LABELS)}
          onValueChange={(status) => {
            setStatus.mutate(
              { id: engineer.userid, status, supervisor: false },
              {
                onSuccess: () => {
                  toast({
                    title: `${engineer.username} is now ${USER_STATUS_LABELS[status].toLowerCase()}`,
                  });
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
          }}
        />
        {workload?.lastAssignedAt && (
          <span className="text-xs text-ink3">
            Last assigned <DateTime value={workload.lastAssignedAt} format="relative" />
          </span>
        )}
      </div>
    </Card>
  );
}

export default function TeamPage() {
  const user = useCurrentUser();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const engineers = useEngineers();

  // GET /users/engineers returns everyone. Until BCR-09 adds "my team", a supervisor narrows it here.
  const team = useMemo(() => {
    const all = engineers.data ?? [];
    return user.role === 'ROLE_ADMIN' ? all : all.filter((row) => row.supervisorId === user.id);
  }, [engineers.data, user]);
  const ids = useMemo(() => team.map((row) => row.userid), [team]);
  const workloads = useWorkloads(ids);
  const summaries = useSummaries(ids);

  const workloadOf = (id: string) => workloads[ids.indexOf(id)]?.data;
  const totalActive = ids.reduce((sum, id) => sum + (workloadOf(id)?.activeIncidentCount ?? 0), 0);
  const available = team.filter(
    (row) =>
      row.status === 'ACTIVE' && (workloadOf(row.userid)?.activeIncidentCount ?? 0) < BUSY_AT,
  ).length;
  const text = search.trim().toLowerCase();
  const shown = team.filter(
    (row) =>
      (filter === 'ALL' || row.status === filter) &&
      (!text ||
        row.username.toLowerCase().includes(text) ||
        row.email.toLowerCase().includes(text)),
  );

  return (
    <div className="flex flex-col gap-5.5">
      <PageHeader
        title="Team"
        description={
          user.role === 'ROLE_ADMIN'
            ? 'All engineers and what is on their plate right now.'
            : 'The engineers who report to you and what is on their plate right now.'
        }
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatCard label="Engineers" value={team.length} loading={engineers.isPending} />
        <StatCard label="Available to assign" value={available} loading={engineers.isPending} />
        <StatCard label="Active incidents" value={totalActive} loading={engineers.isPending} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          aria-label="Find an engineer"
          placeholder="Find an engineer"
          className="md:w-85"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <SegmentedControl<Filter>
          label="Status filter"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'SUSPENDED', label: 'Suspended' },
          ]}
        />
      </div>

      {engineers.isPending && (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          <Skeleton className="h-52 rounded-card" />
          <Skeleton className="h-52 rounded-card" />
        </div>
      )}
      {engineers.isError && (
        <Card>
          <QueryError error={engineers.error} onRetry={() => void engineers.refetch()} />
        </Card>
      )}
      {engineers.isSuccess && shown.length === 0 && (
        <Card>
          <EmptyState
            title={team.length === 0 ? 'No engineers on your team yet' : 'No engineers match'}
            description={
              team.length === 0
                ? 'An admin can add engineers to your team.'
                : 'Try another name or switch the status filter.'
            }
          />
        </Card>
      )}
      {shown.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-4">
          {shown.map((engineer) => (
            <EngineerCard
              key={engineer.userid}
              engineer={engineer}
              workload={workloadOf(engineer.userid)}
              summary={
                backendSupports('engineerSummaries')
                  ? summaries.data?.find((row) => row.engineerId === engineer.userid)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
