import { SlaIndicator } from '@/shared/ui';
import type { IncidentSla } from '../types';

export interface IncidentSlaBadgeProps {
  sla: IncidentSla | undefined;
  className?: string;
}

/** The SLA that matters right now: assignment until someone has it, then resolution. */
export function IncidentSlaBadge({ sla, className }: IncidentSlaBadgeProps) {
  if (!sla) return <span className="text-label text-ink3">{'—'}</span>;
  return sla.assignedAt || sla.resolvedAt ? (
    <SlaIndicator
      deadline={sla.resolutionDeadline}
      startedAt={sla.startedAt}
      stoppedAt={sla.resolvedAt}
      breached={sla.resolutionSlaBreached}
      className={className}
    />
  ) : (
    <SlaIndicator
      deadline={sla.assignmentDeadline}
      startedAt={sla.startedAt}
      breached={sla.assignmentSlaBreached}
      className={className}
    />
  );
}
