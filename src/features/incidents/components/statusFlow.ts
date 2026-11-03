import type { IncidentStatus } from '@/shared/lib/constants/domain';

export interface StatusOption {
  status: IncidentStatus;
  label: string;
  hint: string;
}

const START: StatusOption = {
  status: 'IN_PROGRESS',
  label: 'Start work',
  hint: 'Someone is working on this now.',
};
const RESOLVE: StatusOption = {
  status: 'RESOLVED',
  label: 'Resolve',
  hint: 'Needs a root cause and resolution notes.',
};
const CLOSE: StatusOption = {
  status: 'CLOSED',
  label: 'Close',
  hint: 'The fix is confirmed. Nothing more to do.',
};
const REOPEN: StatusOption = {
  status: 'REOPENED',
  label: 'Reopen',
  hint: 'The problem came back or was not fixed.',
};

// The BCR-03 rules. The backend enforces the same table (IncidentStatus.allowedNext in IncidentService) and answers
// 409 INVALID_STATUS_TRANSITION to anything else, so this only decides which buttons to show.
export const NEXT_STATUSES: Record<IncidentStatus, StatusOption[]> = {
  OPEN: [START, RESOLVE],
  ASSIGNED: [START, RESOLVE],
  IN_PROGRESS: [RESOLVE],
  RESOLVED: [CLOSE, REOPEN],
  CLOSED: [REOPEN],
  REOPENED: [START, RESOLVE],
};

export const STEPS: { label: string; reachedBy: IncidentStatus[] }[] = [
  {
    label: 'Open',
    reachedBy: ['OPEN', 'REOPENED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  },
  { label: 'Assigned', reachedBy: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
  { label: 'In progress', reachedBy: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
  { label: 'Resolved', reachedBy: ['RESOLVED', 'CLOSED'] },
  { label: 'Closed', reachedBy: ['CLOSED'] },
];

export const isFinished = (status: IncidentStatus) => status === 'RESOLVED' || status === 'CLOSED';
