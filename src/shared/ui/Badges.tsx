import { cva, type VariantProps } from 'class-variance-authority';
import { CircleUserRound, Clock } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useNow } from '../hooks/useNow';
import { cn } from '../lib/cn';
import {
  INCIDENT_STATUS_LABELS,
  LEVEL_LABELS,
  ROLE_LABELS,
  USER_STATUS_LABELS,
  type IncidentStatus,
  type Priority,
  type Role,
  type Severity,
  type UserStatus,
} from '../lib/constants/domain';
import { getSlaView, type SlaInput, type SlaTone } from '../lib/sla';

const badgeStyles = cva(
  'inline-flex h-6 items-center gap-1.5 rounded-[7px] px-2 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-lowbg text-low',
        accent: 'bg-accbg text-acc',
        ok: 'bg-s-resbg text-s-res',
        risk: 'bg-highbg text-high',
        bad: 'bg-critbg text-crit',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeStyles>;

export function Badge({ tone, className, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone }), className)} {...props} />;
}

const LEVEL_NUMBER: Record<Severity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const BAR_HEIGHTS = ['h-[5px]', 'h-[7px]', 'h-2.5', 'h-3'];

function LevelBars({ level }: { level: Severity }) {
  return (
    <span aria-hidden="true" className="inline-flex h-3 items-end gap-0.5">
      {BAR_HEIGHTS.map((height, index) => (
        <b
          key={height}
          className={cn(
            'block w-0.75 rounded-[1px] bg-current',
            height,
            index >= LEVEL_NUMBER[level] && 'opacity-25',
          )}
        />
      ))}
    </span>
  );
}

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: 'bg-critbg text-crit',
  HIGH: 'bg-highbg text-high',
  MEDIUM: 'bg-medbg text-med',
  LOW: 'bg-lowbg text-low',
};

/** Bars and a word as well as colour, so it still reads without seeing colour. */
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.75 rounded-[7px] pr-2.5 pl-2 text-xs font-semibold whitespace-nowrap',
        SEVERITY_STYLES[severity],
        className,
      )}
    >
      <LevelBars level={severity} />
      <span>
        <span className="sr-only">Severity: </span>
        {LEVEL_LABELS[severity]}
      </span>
    </span>
  );
}

/** Neutral on purpose: only severity and SLA health get to be loud. */
export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.75 rounded-[7px] border border-line bg-sunken pr-2.5 pl-2 text-xs font-medium whitespace-nowrap text-ink2',
        className,
      )}
    >
      <LevelBars level={priority} />
      <span>
        <span className="sr-only">Priority: </span>
        {LEVEL_LABELS[priority]}
      </span>
    </span>
  );
}

const STATUS_STYLES: Record<IncidentStatus, string> = {
  OPEN: 'bg-s-openbg text-s-open',
  ASSIGNED: 'bg-s-asgbg text-s-asg',
  IN_PROGRESS: 'bg-s-progbg text-s-prog',
  RESOLVED: 'bg-s-resbg text-s-res',
  CLOSED: 'bg-s-clobg text-s-clo',
  REOPENED: 'bg-s-reobg text-s-reo',
};

export function StatusPill({ status, className }: { status: IncidentStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5.5 items-center gap-1.5 rounded-full pr-2.25 pl-2 text-xs font-medium whitespace-nowrap',
        STATUS_STYLES[status],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      <span>
        <span className="sr-only">Status: </span>
        {INCIDENT_STATUS_LABELS[status]}
      </span>
    </span>
  );
}

const SLA_STYLES: Record<SlaTone, string> = {
  ok: 'bg-s-resbg text-s-res',
  risk: 'bg-highbg text-high',
  bad: 'bg-critbg text-crit',
  idle: 'bg-lowbg text-low',
};

export interface SlaIndicatorProps extends SlaInput {
  className?: string;
}

/** Counts down by itself. Show it only with real backend deadlines (BCR-07), never estimates. */
export function SlaIndicator({ className, ...sla }: SlaIndicatorProps) {
  const now = useNow();
  const { tone, label } = getSlaView(sla, now);
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-[7px] px-2.25 text-xs font-medium whitespace-nowrap tabular-nums',
        SLA_STYLES[tone],
        className,
      )}
    >
      <Clock aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

const ROLE_STYLES: Record<Role, string> = {
  ROLE_ADMIN: 'bg-s-asgbg text-s-asg',
  ROLE_SUPERVISOR: 'bg-s-openbg text-s-open',
  ROLE_ENGINEER: 'bg-lowbg text-low',
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5.5 items-center rounded-md px-2 text-xs font-semibold',
        ROLE_STYLES[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

const USER_STATUS_TONES = { ACTIVE: 'ok', INACTIVE: 'neutral', SUSPENDED: 'bad' } as const;

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={USER_STATUS_TONES[status]}>{USER_STATUS_LABELS[status]}</Badge>;
}

const AVATAR_TONES = [
  'bg-lowbg text-low',
  'bg-s-openbg text-s-open',
  'bg-s-asgbg text-s-asg',
  'bg-s-progbg text-s-prog',
  'bg-s-resbg text-s-res',
  'bg-s-reobg text-s-reo',
];

function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return `${first}${second}`.toUpperCase();
}

export interface AvatarProps {
  /** No name means nobody is assigned, shown as a dashed circle. */
  name?: string | null | undefined;
  size?: 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const sizes = size === 'lg' ? 'size-10 text-sm' : 'size-7 text-[11px]';
  if (!name) {
    return (
      <span
        role="img"
        aria-label="Unassigned"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-line2 text-ink3',
          sizes,
          className,
        )}
      >
        <CircleUserRound aria-hidden="true" className="size-4" />
      </span>
    );
  }
  // The same person always gets the same colour.
  let code = 0;
  for (let index = 0; index < name.length; index += 1) code += name.charCodeAt(index);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizes,
        AVATAR_TONES[code % AVATAR_TONES.length],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
