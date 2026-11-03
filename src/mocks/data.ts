// Made-up sample data for development. It never reaches a production build (see main.tsx).
// Shapes copy the backend DTOs field by field, and every answer is checked by the same Zod schemas
// the real answers go through, so a wrong shape here fails just as it would against the backend.
import { env } from '@/shared/lib/env';

const OFFSET_MINUTES = (() => {
  const [hours = 0, minutes = 0] = env.serverUtcOffset.slice(1).split(':').map(Number);
  return (hours * 60 + minutes) * (env.serverUtcOffset.startsWith('-') ? -1 : 1);
})();

/** A time in the backend's format: LocalDateTime, in the server's clock, with no timezone. */
export function serverTime(minutesFromNow: number): string {
  const shifted = new Date(Date.now() + (minutesFromNow + OFFSET_MINUTES) * 60_000);
  return shifted.toISOString().slice(0, 19);
}

export interface MockUser {
  userid: string;
  username: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roles: string[];
  supervisorId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

const id = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const person = (
  n: number,
  username: string,
  role: string,
  supervisorId: string | null,
  status: MockUser['status'] = 'ACTIVE',
): MockUser => ({
  userid: id(n),
  username,
  email: `${username.toLowerCase().replace(' ', '.')}@imp.example`,
  status,
  roles: [role],
  supervisorId,
  createdAt: serverTime(-60 * 24 * 90),
  updatedAt: serverTime(-60 * 24),
  lastLoginAt: status === 'ACTIVE' ? serverTime(-(n * 37)) : null,
});

export const MOCK_PASSWORD = 'password';
export const ADMIN = id(1);
export const SUPERVISOR = id(2);
export const ENGINEER = id(4);

export const users: MockUser[] = [
  person(1, 'Dana Kim', 'ROLE_ADMIN', null),
  person(2, 'Meera Patel', 'ROLE_SUPERVISOR', null),
  person(3, 'Arjun Das', 'ROLE_SUPERVISOR', null),
  person(4, 'Ravi Sharma', 'ROLE_ENGINEER', SUPERVISOR),
  person(5, 'Priya Nair', 'ROLE_ENGINEER', SUPERVISOR),
  person(6, 'Kabir Mehta', 'ROLE_ENGINEER', SUPERVISOR),
  person(7, 'Asha Kulkarni', 'ROLE_ENGINEER', SUPERVISOR),
  person(8, 'Sam Lee', 'ROLE_ENGINEER', SUPERVISOR, 'INACTIVE'),
  person(9, 'Neha Gupta', 'ROLE_ENGINEER', id(3)),
];

export interface MockIncident {
  id: string;
  title: string;
  severity: string;
  incidentStatus: string;
  priority: string;
  createdBy: string;
  assignedTo: string | null;
  assignedBy: string | null;
  description: string;
  serviceName: string;
  category: string;
  environment: string;
  affectedSource: string | null;
  location: string | null;
  rootCause: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Minutes allowed to assign and to resolve, from the backend's SLAConfiguration table.
export const SLA_MINUTES: Record<string, { assign: number; resolve: number }> = {
  CRITICAL: { assign: 15, resolve: 240 },
  HIGH: { assign: 60, resolve: 1440 },
  MEDIUM: { assign: 240, resolve: 4320 },
  LOW: { assign: 1440, resolve: 10080 },
};

type Seed = [
  title: string,
  severity: string,
  status: string,
  service: string,
  category: string,
  ageMinutes: number,
  createdBy: number,
  assignedTo: number | null,
];

const SEEDS: Seed[] = [
  [
    'Payment API returning 502 on checkout',
    'CRITICAL',
    'IN_PROGRESS',
    'PAYMENT_SERVICE',
    'API',
    188,
    7,
    4,
  ],
  ['Replica lag on orders-db', 'HIGH', 'OPEN', 'USER_SERVICE', 'DATABASE', 68, 5, null],
  [
    'Notification service restarting repeatedly',
    'CRITICAL',
    'OPEN',
    'NOTIFICATION_SERVICE',
    'INFRASTRUCTURE',
    11,
    6,
    null,
  ],
  ['Login latency above 3s in ap-south', 'HIGH', 'ASSIGNED', 'AUTH_SERVICE', 'NETWORK', 1360, 4, 5],
  [
    'Email queue backlog growing',
    'MEDIUM',
    'IN_PROGRESS',
    'EMAIL_SERVICE',
    'INFRASTRUCTURE',
    4500,
    7,
    6,
  ],
  ['Search index out of sync', 'MEDIUM', 'ASSIGNED', 'REPORTING_SERVICE', 'DATABASE', 600, 2, 4],
  [
    'Gateway timeouts on report export',
    'HIGH',
    'REOPENED',
    'APIGATEWAY_SERVICE',
    'NETWORK',
    2900,
    4,
    4,
  ],
  ['Password reset emails delayed', 'LOW', 'ASSIGNED', 'EMAIL_SERVICE', 'API', 3000, 4, 4],
  ['Typo on status page', 'LOW', 'RESOLVED', 'OTHERS', 'CUSTOMER', 1900, 5, 5],
  ['Disk almost full on metrics host', 'MEDIUM', 'CLOSED', 'OTHERS', 'HARDWARE', 9000, 6, 6],
  ['Card refunds stuck in pending', 'HIGH', 'RESOLVED', 'PAYMENT_SERVICE', 'API', 5200, 7, 5],
  ['Session cookie missing on Safari', 'MEDIUM', 'OPEN', 'AUTH_SERVICE', 'CUSTOMER', 320, 4, null],
  [
    'Kafka consumer lag on reporting',
    'HIGH',
    'IN_PROGRESS',
    'REPORTING_SERVICE',
    'INFRASTRUCTURE',
    410,
    2,
    6,
  ],
  ['Badge reader offline at site B', 'LOW', 'OPEN', 'OTHERS', 'SAFETY', 2100, 9, null],
  ['Profile photo upload fails', 'LOW', 'CLOSED', 'USER_SERVICE', 'API', 12000, 5, 7],
  ['DNS failover test failed', 'HIGH', 'RESOLVED', 'APIGATEWAY_SERVICE', 'NETWORK', 16000, 2, 7],
  [
    'Invoices rendering wrong currency',
    'MEDIUM',
    'ASSIGNED',
    'PAYMENT_SERVICE',
    'CUSTOMER',
    800,
    9,
    9,
  ],
  ['Rate limit too strict for imports', 'LOW', 'OPEN', 'APIGATEWAY_SERVICE', 'API', 2600, 3, null],
  ['Database backup job skipped', 'CRITICAL', 'RESOLVED', 'OTHERS', 'DATABASE', 22000, 1, 5],
  [
    'Report totals off by one day',
    'MEDIUM',
    'IN_PROGRESS',
    'REPORTING_SERVICE',
    'OTHER',
    1500,
    6,
    7,
  ],
  [
    'Notification links open wrong page',
    'LOW',
    'REOPENED',
    'NOTIFICATION_SERVICE',
    'CUSTOMER',
    7000,
    7,
    7,
  ],
  ['Certificate expires in 7 days', 'HIGH', 'OPEN', 'AUTH_SERVICE', 'INFRASTRUCTURE', 45, 2, null],
];

const DONE = new Set(['RESOLVED', 'CLOSED']);

export const incidents: MockIncident[] = SEEDS.map(
  ([title, severity, status, service, category, age, by, to], index) => ({
    id: `${(0x3f2a9c10 + index * 7919).toString(16)}-1111-4111-8111-${String(index).padStart(12, '0')}`,
    title,
    severity,
    incidentStatus: status,
    priority: severity,
    createdBy: id(by),
    assignedTo: to === null ? null : id(to),
    assignedBy: to === null ? null : SUPERVISOR,
    description:
      index === 0
        ? 'Checkout requests have been failing with a 502 since 09:42. The gateway error rate for the payment route rose from 0.2% to 31% within ten minutes. Customers see "Payment could not be processed" and retries make it worse. The failures started shortly after the 09:30 deploy of payment-service v2.14.'
        : `${title}. Sample description for development.`,
    serviceName: service,
    category,
    environment: index % 5 === 3 ? 'STAGING' : 'PRODUCTION',
    affectedSource: index === 0 ? 'gateway to payment-service' : null,
    location: index === 0 ? 'eu-west checkout cluster' : null,
    rootCause: DONE.has(status) ? 'A configuration change reduced the connection pool.' : null,
    resolutionNotes: DONE.has(status) ? 'Restored the pool size and added an alert.' : null,
    createdAt: serverTime(-age),
    updatedAt: serverTime(-Math.floor(age / 3)),
  }),
);

export interface MockNotification {
  id: string;
  incidentId: string;
  recipientId: string;
  type: string;
  status: string;
  message: string;
  createdAt: string;
}

const noteId = (n: number) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;
const pick = (index: number) => incidents[index]?.id ?? '';

const NOTE_SEEDS: [string, number, string, number][] = [
  [
    'SLA_ASSIGNMENT_AT_RISK',
    2,
    'Assignment at risk: Notification service restarting repeatedly',
    4,
  ],
  ['SLA_ASSIGNMENT_BREACHED', 1, 'SLA breached: assignment for Replica lag on orders-db', 8],
  ['SLA_RESOLUTION_AT_RISK', 0, 'Resolution at risk: Payment API returning 502 on checkout', 21],
  ['INCIDENT_ASSIGNED', 5, 'You were assigned Search index out of sync', 62],
  ['INCIDENT_RESOLVED', 8, 'Typo on status page was resolved', 185],
  ['INCIDENT_STATUS_UPDATED', 4, 'Email queue backlog growing moved to In progress', 400],
  ['INCIDENT_CREATED', 11, 'A new incident was reported: Session cookie missing on Safari', 320],
  ['SLA_RESOLUTION_BREACHED', 4, 'SLA breached: resolution for Email queue backlog growing', 190],
  ['INCIDENT_REOPENED', 6, 'Gateway timeouts on report export was reopened', 2880],
  ['INCIDENT_METADATA_UPDATED', 12, 'Details changed on Kafka consumer lag on reporting', 3000],
  ['INCIDENT_ASSIGNED', 7, 'You were assigned Password reset emails delayed', 2990],
  ['INCIDENT_RESOLVED', 10, 'Card refunds stuck in pending was resolved', 5000],
];

export const notifications: MockNotification[] = users.flatMap((user, u) =>
  NOTE_SEEDS.map(([type, incident, message, age], n) => ({
    id: noteId(u * 100 + n),
    incidentId: pick(incident),
    recipientId: user.userid,
    type,
    status: 'RECORDED',
    message,
    createdAt: serverTime(-age),
  })),
);

export interface MockAudit {
  incidentId: string;
  eventId: string;
  eventType: string;
  performedBy: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}

export const extraAudit: MockAudit[] = [];
