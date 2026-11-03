import { z } from 'zod';
import { INCIDENT_STATUSES, SEVERITIES } from '@/shared/lib/constants/domain';
import { pageSchema } from '@/shared/lib/api/schemas';

/** MetricsResponseDTO. These are all-time totals. Average times are in seconds. */
export const metricsSchema = z.object({
  totalIncidents: z.number(),
  openIncidents: z.number(),
  resolvedIncidents: z.number(),
  avgResolutionTime: z.number().nullable(),
  avgAssignmentTime: z.number().nullable(),
  assignmentSLA_BreachedCount: z.number(),
  resolutionSLA_BreachedCount: z.number(),
});
export type Metrics = z.infer<typeof metricsSchema>;

/**
 * IncidentsHappeningTrendDTO. The Java type is `Date`, so its exact JSON form needs confirming
 * against the real backend. This accepts both forms Jackson can send: a date string or a timestamp.
 */
export const trendSchema = z.object({
  incidentsDate: z.union([z.string(), z.number()]).transform(String),
  count: z.number(),
});
export type TrendPoint = z.infer<typeof trendSchema>;

/** TopFailingServicesDTO. */
export const topServiceSchema = z.object({ serviceName: z.string(), count: z.number() });

/** IncidentReportResponseDTO. */
export const reportRowSchema = z.object({
  incidentId: z.string(),
  title: z.string(),
  severity: z.enum(SEVERITIES),
  priority: z.string().nullable(),
  status: z.enum(INCIDENT_STATUSES),
  serviceName: z.string().nullable(),
  category: z.string().nullable(),
  createdBy: z.string().nullable(),
  assignedTo: z.string().nullable(),
  assignedBy: z.string().nullable(),
  createdAt: z.string().nullable(),
  assignedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  timeToAssignSeconds: z.number().nullable(),
  resolutionTimeSeconds: z.number().nullable(),
});
export type ReportRow = z.infer<typeof reportRowSchema>;

export const reportPageSchema = pageSchema(reportRowSchema);
