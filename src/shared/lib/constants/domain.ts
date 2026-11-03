// Values copied from the backend's Java enums. Labels are what people see.
export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const LEVEL_LABELS: Record<Severity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const INCIDENT_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
};

export const ENVIRONMENT_LABELS = {
  PRODUCTION: 'Production',
  STAGING: 'Staging',
  DEVELOPMENT: 'Development',
  LOCAL: 'Local',
  OTHERS: 'Others',
} as const;
export type Environment = keyof typeof ENVIRONMENT_LABELS;

export const CATEGORY_LABELS = {
  API: 'API',
  DATABASE: 'Database',
  NETWORK: 'Network',
  INFRASTRUCTURE: 'Infrastructure',
  HARDWARE: 'Hardware',
  CUSTOMER: 'Customer',
  SAFETY: 'Safety',
  OTHER: 'Other',
} as const;
export type IncidentCategory = keyof typeof CATEGORY_LABELS;

export const SERVICE_LABELS = {
  USER_SERVICE: 'User service',
  EMAIL_SERVICE: 'Email service',
  NOTIFICATION_SERVICE: 'Notification service',
  PAYMENT_SERVICE: 'Payment service',
  AUTH_SERVICE: 'Auth service',
  APIGATEWAY_SERVICE: 'API gateway',
  REPORTING_SERVICE: 'Reporting service',
  OTHERS: 'Others',
} as const;
export type ServiceName = keyof typeof SERVICE_LABELS;

export const ROLE_LABELS = {
  ROLE_ADMIN: 'Admin',
  ROLE_SUPERVISOR: 'Supervisor',
  ROLE_ENGINEER: 'Engineer',
} as const;
export type Role = keyof typeof ROLE_LABELS;

export const USER_STATUS_LABELS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
} as const;
export type UserStatus = keyof typeof USER_STATUS_LABELS;
