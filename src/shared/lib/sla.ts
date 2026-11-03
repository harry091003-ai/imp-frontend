import { formatDuration, parseBackendDate } from './date';

export type SlaTone = 'ok' | 'risk' | 'bad' | 'idle';

export interface SlaInput {
  deadline: string | null | undefined;
  /** Start of the SLA window. With it, "at risk" means the last quarter of the window. */
  startedAt?: string | null | undefined;
  /** From the backend. It always wins over what the clock says. */
  breached?: boolean | undefined;
  /** When the SLA stopped, such as the time the incident was resolved. */
  stoppedAt?: string | null | undefined;
}

export interface SlaView {
  tone: SlaTone;
  label: string;
}

const RISK_FRACTION = 0.25;
const RISK_FALLBACK_SECONDS = 3_600;

export function getSlaView(input: SlaInput, now: Date = new Date()): SlaView {
  const deadline = parseBackendDate(input.deadline);
  const stoppedAt = parseBackendDate(input.stoppedAt);

  if (stoppedAt) {
    const missed = input.breached === true || (deadline !== null && stoppedAt > deadline);
    return missed ? { tone: 'bad', label: 'SLA missed' } : { tone: 'ok', label: 'SLA met' };
  }
  if (!deadline) return { tone: 'idle', label: 'No SLA' };

  const left = (deadline.getTime() - now.getTime()) / 1000;
  if (input.breached === true || left <= 0) {
    return { tone: 'bad', label: `Breached ${formatDuration(left)} ago` };
  }

  const startedAt = parseBackendDate(input.startedAt);
  const riskFrom = startedAt
    ? ((deadline.getTime() - startedAt.getTime()) / 1000) * RISK_FRACTION
    : RISK_FALLBACK_SECONDS;
  return { tone: left <= riskFrom ? 'risk' : 'ok', label: `${formatDuration(left)} left` };
}
