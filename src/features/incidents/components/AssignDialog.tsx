import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useEngineers, useUserNames, type User } from '@/features/users';
import { cn } from '@/shared/lib/cn';
import { toApiError } from '@/shared/lib/http/errors';
import { useCurrentUser } from '@/shared/lib/session';
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  InlineAlert,
  SegmentedControl,
  SeverityBadge,
  Skeleton,
  Spinner,
  TraceReference,
  useToast,
} from '@/shared/ui';
import { useAssignIncident, useEngineerRecommendations } from '../hooks';
import type { EngineerCandidate, Incident } from '../types';

const percent = (value: number) => `${String(Math.round(value * 100))}%`;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-ink3">{label}</span>
      <b className="text-label font-semibold text-ink tabular-nums">{value}</b>
    </div>
  );
}

interface ChoiceProps {
  id: string;
  name: string;
  selected: boolean;
  disabled?: boolean;
  onPick: () => void;
  children?: React.ReactNode;
  tag?: React.ReactNode;
  note?: string;
}

function Choice({ id, name, selected, disabled, onPick, children, tag, note }: ChoiceProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col gap-3 rounded-input border p-3.5 has-focus-visible:outline-2 has-focus-visible:outline-acc',
        selected ? 'border-acc bg-accbg' : 'border-line hover:bg-sunken',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span className="flex items-center gap-3">
        <input
          type="radio"
          name="engineer"
          value={id}
          checked={selected}
          disabled={disabled}
          onChange={onPick}
          className="size-4 accent-(--acc)"
        />
        <Avatar name={name} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <b className="text-[15px] font-semibold text-ink">{name}</b>
            {tag}
          </span>
          {note && <span className="text-xs text-ink3">{note}</span>}
        </span>
      </span>
      {children}
    </label>
  );
}

export interface AssignDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignDialog({ incident, open, onOpenChange }: AssignDialogProps) {
  const user = useCurrentUser();
  const toast = useToast();
  // "My team" first: an AI ranking is a paid call, limited to 5 a minute, so it runs on request.
  const [tab, setTab] = useState<'team' | 'ai'>('team');
  const [selected, setSelected] = useState<string>();
  const engineers = useEngineers(open);
  const recommend = useEngineerRecommendations();
  const assign = useAssignIncident(incident.id);

  // Only an admin may assign outside a team. The backend enforces this too.
  const team = useMemo<User[]>(() => {
    const all = engineers.data ?? [];
    return user.role === 'ROLE_ADMIN' ? all : all.filter((row) => row.supervisorId === user.id);
  }, [engineers.data, user]);
  const candidates: EngineerCandidate[] = useMemo(
    () => [...(recommend.data ?? [])].sort((a, b) => b.finalRankingScore - a.finalRankingScore),
    [recommend.data],
  );
  const names = useUserNames(useMemo(() => candidates.map((row) => row.engineerId), [candidates]));
  const nameOf = (id: string) =>
    team.find((row) => row.userid === id)?.username ?? names.get(id) ?? id.slice(0, 8);

  const failure = assign.error ? toApiError(assign.error) : null;
  const aiFailure = recommend.error ? toApiError(recommend.error) : null;

  return (
    <Dialog
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
      title="Assign incident"
      description={
        <span className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <span className="font-medium text-ink">{incident.title}</span>
          <code className="font-mono text-xs">{incident.id.slice(0, 8)}</code>
        </span>
      }
      footer={
        <>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selected}
            loading={assign.isPending}
            onClick={() => {
              if (!selected) return;
              assign.mutate(selected, {
                onSuccess: () => {
                  toast({ title: `Assigned to ${nameOf(selected)}` });
                  onOpenChange(false);
                },
              });
            }}
          >
            {selected ? `Assign to ${nameOf(selected)}` : 'Assign'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label="Assignment source"
            value={tab}
            onValueChange={setTab}
            options={[
              { value: 'team', label: user.role === 'ROLE_ADMIN' ? 'All engineers' : 'My team' },
              { value: 'ai', label: 'AI recommended' },
            ]}
          />
          {user.role !== 'ROLE_ADMIN' && (
            <span className="text-xs text-ink3">Only engineers on your team can be assigned</span>
          )}
        </div>

        {failure && (
          <InlineAlert tone="error">
            {failure.message}
            {failure.traceId && <TraceReference traceId={failure.traceId} className="mt-1 flex" />}
          </InlineAlert>
        )}

        <div role="radiogroup" aria-label="Engineer" className="flex flex-col gap-2.5">
          {tab === 'team' && engineers.isPending && <Skeleton className="h-16 rounded-input" />}
          {tab === 'team' && engineers.isError && (
            <InlineAlert tone="error">{toApiError(engineers.error).message}</InlineAlert>
          )}
          {tab === 'team' && engineers.isSuccess && team.length === 0 && (
            <p className="py-6 text-center text-ink2">No engineers are on your team yet.</p>
          )}
          {tab === 'team' &&
            team.map((engineer) => (
              <Choice
                key={engineer.userid}
                id={engineer.userid}
                name={engineer.username}
                note={engineer.email}
                selected={selected === engineer.userid}
                disabled={engineer.status !== 'ACTIVE'}
                tag={engineer.status !== 'ACTIVE' && <Badge>Inactive</Badge>}
                onPick={() => {
                  setSelected(engineer.userid);
                }}
              />
            ))}

          {tab === 'ai' && (
            <InlineAlert tone="info">
              A suggestion, ranked by similar incidents solved, workload, SLA record and expertise.
              You decide.
            </InlineAlert>
          )}
          {tab === 'ai' && aiFailure && (
            <InlineAlert tone={aiFailure.status === 429 ? 'warning' : 'error'}>
              {aiFailure.status === 429
                ? `You have used your AI requests for now. Try again in ${String(aiFailure.retryAfterSeconds ?? 60)} seconds.`
                : aiFailure.message}
            </InlineAlert>
          )}
          {tab === 'ai' && recommend.isPending && (
            <p role="status" className="flex items-center gap-2 py-4 text-label text-ink2">
              <Spinner /> Ranking engineers. This can take a little while.
            </p>
          )}
          {tab === 'ai' && !recommend.data && !recommend.isPending && (
            <Button
              className="self-start"
              onClick={() => {
                recommend.mutate({
                  title: incident.title,
                  description: incident.description ?? incident.title,
                  category: incident.category,
                  serviceName: incident.serviceName,
                });
              }}
            >
              <Sparkles aria-hidden="true" />
              Get AI ranking
            </Button>
          )}
          {tab === 'ai' && recommend.data?.length === 0 && (
            <p className="py-6 text-center text-ink2">No engineers can be recommended right now.</p>
          )}
          {tab === 'ai' &&
            candidates.map((candidate, index) => (
              <Choice
                key={candidate.engineerId}
                id={candidate.engineerId}
                name={nameOf(candidate.engineerId)}
                selected={selected === candidate.engineerId}
                tag={
                  <>
                    {index === 0 && <Badge tone="ok">Best match</Badge>}
                    <Badge tone="accent">Match {percent(candidate.finalRankingScore)}</Badge>
                  </>
                }
                onPick={() => {
                  setSelected(candidate.engineerId);
                }}
              >
                {candidate.statsAvailable ? (
                  <span className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:pl-18">
                    <Metric label="Similar solved" value={String(candidate.similarIncidentCount)} />
                    <Metric label="Active now" value={String(candidate.activeIncidents)} />
                    <Metric label="SLA record" value={percent(candidate.slaSuccessRate)} />
                    <Metric label="Expertise" value={percent(candidate.expertiseScore)} />
                  </span>
                ) : (
                  <span className="text-xs text-ink3 sm:pl-18">
                    Workload and SLA numbers are unavailable right now.
                  </span>
                )}
              </Choice>
            ))}
        </div>
      </div>
    </Dialog>
  );
}
