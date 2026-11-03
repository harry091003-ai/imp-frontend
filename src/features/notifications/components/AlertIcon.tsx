import {
  CircleAlert,
  CircleCheck,
  Clock,
  FilePlus2,
  Pencil,
  RotateCcw,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface AlertLook {
  icon: LucideIcon;
  styles: string;
  ink: string;
  label: string;
}

const LOOKS: Record<string, AlertLook> = {
  SLA_ASSIGNMENT_BREACHED: {
    icon: CircleAlert,
    styles: 'bg-critbg text-crit',
    ink: 'text-crit',
    label: 'Assignment SLA breached',
  },
  SLA_RESOLUTION_BREACHED: {
    icon: CircleAlert,
    styles: 'bg-critbg text-crit',
    ink: 'text-crit',
    label: 'Resolution SLA breached',
  },
  SLA_ASSIGNMENT_AT_RISK: {
    icon: Clock,
    styles: 'bg-highbg text-high',
    ink: 'text-high',
    label: 'Assignment at risk',
  },
  SLA_RESOLUTION_AT_RISK: {
    icon: Clock,
    styles: 'bg-highbg text-high',
    ink: 'text-high',
    label: 'Resolution at risk',
  },
  INCIDENT_ASSIGNED: {
    icon: UserPlus,
    styles: 'bg-s-asgbg text-s-asg',
    ink: 'text-s-asg',
    label: 'Assigned',
  },
  INCIDENT_RESOLVED: {
    icon: CircleCheck,
    styles: 'bg-s-resbg text-s-res',
    ink: 'text-s-res',
    label: 'Resolved',
  },
  INCIDENT_REOPENED: {
    icon: RotateCcw,
    styles: 'bg-s-reobg text-s-reo',
    ink: 'text-s-reo',
    label: 'Reopened',
  },
  INCIDENT_CREATED: {
    icon: FilePlus2,
    styles: 'bg-s-openbg text-s-open',
    ink: 'text-s-open',
    label: 'New incident',
  },
};

const FALLBACK: AlertLook = {
  icon: Pencil,
  styles: 'bg-lowbg text-low',
  ink: 'text-low',
  label: 'Updated',
};

export function alertLabel(type: string): { label: string; ink: string } {
  return LOOKS[type] ?? FALLBACK;
}

export function AlertIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const { icon: Icon, styles } = LOOKS[type] ?? FALLBACK;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center',
        size === 'sm' ? 'size-8 rounded-[9px]' : 'size-10 rounded-[11px]',
        styles,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </span>
  );
}
