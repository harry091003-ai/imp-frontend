import { z } from 'zod';
import {
  CATEGORY_LABELS,
  ENVIRONMENT_LABELS,
  INCIDENT_STATUSES,
  PRIORITIES,
  SERVICE_LABELS,
  SEVERITIES,
  type IncidentCategory,
  type Environment,
  type ServiceName,
} from '@/shared/lib/constants/domain';
import { pageSchema } from '@/shared/lib/api/schemas';

const keysOf = <T extends string>(labels: Record<T, string>) => Object.keys(labels) as [T, ...T[]];

export const severitySchema = z.enum(SEVERITIES);
export const prioritySchema = z.enum(PRIORITIES);
export const statusSchema = z.enum(INCIDENT_STATUSES);
export const environmentSchema = z.enum(keysOf<Environment>(ENVIRONMENT_LABELS));
export const categorySchema = z.enum(keysOf<IncidentCategory>(CATEGORY_LABELS));
export const serviceSchema = z.enum(keysOf<ServiceName>(SERVICE_LABELS));

/** IncidentResponseDTO. */
export const incidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: severitySchema,
  incidentStatus: statusSchema,
  priority: prioritySchema,
  createdBy: z.string(),
  assignedTo: z.string().nullable(),
  assignedBy: z.string().nullable(),
  description: z.string().nullable(),
  serviceName: serviceSchema.nullable(),
  category: categorySchema.nullable(),
  environment: environmentSchema.nullable(),
  affectedSource: z.string().nullable(),
  location: z.string().nullable(),
  rootCause: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export type Incident = z.infer<typeof incidentSchema>;

export const incidentPageSchema = pageSchema(incidentSchema);

/** CreateIncidentResponseDTO. */
export const createdIncidentSchema = z.object({ incidentId: z.string(), message: z.string() });

/** CreateIncidentRequestDTO. The limits copy the backend's, so most mistakes are caught early. */
export const createIncidentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description is too long'),
  severity: severitySchema,
  priority: prioritySchema,
  environment: environmentSchema,
  serviceName: serviceSchema,
  category: categorySchema,
  location: z.string().max(255, 'Location is too long').optional(),
  affectedSource: z.string().max(255, 'Affected source is too long').optional(),
});
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

/** UpdateIncidentMetadate_RequestDTO. Service and category are not editable on the backend. */
export const updateIncidentSchema = createIncidentSchema.omit({
  serviceName: true,
  category: true,
});
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;

/** UpdateIncidentStatus_RequestDTO. */
export const resolutionSchema = z.object({
  rootCause: z.string().trim().min(1, 'Give the root cause').max(2000, 'Root cause is too long'),
  resolutionNotes: z
    .string()
    .trim()
    .min(1, 'Give resolution notes')
    .max(2000, 'Resolution notes are too long'),
});
export type ResolutionInput = z.infer<typeof resolutionSchema>;

/** Proposed, BCR-07. */
export const slaSchema = z.object({
  incidentId: z.string(),
  assignmentDeadline: z.string().nullable(),
  resolutionDeadline: z.string().nullable(),
  assignmentSlaBreached: z.boolean(),
  resolutionSlaBreached: z.boolean(),
  assignedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
});
export type IncidentSla = z.infer<typeof slaSchema>;

/** IncidentAuditDTO. */
export const auditSchema = z.object({
  incidentId: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  performedBy: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  timestamp: z.string().nullable(),
});
export type AuditEntry = z.infer<typeof auditSchema>;

/** IncidentResolvementSuggestionDTO. */
export const suggestionSchema = z.object({
  status: z.enum(['OK', 'NOT_ENOUGH_SIMILAR_INCIDENTS']),
  rootCause: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  sameCategoryAndService: z.boolean(),
  sources: z
    .array(
      z.object({
        incidentId: z.string().nullable(),
        similarity: z.number(),
        resolvedBy: z.string().nullable(),
        resolvedAt: z.string().nullable(),
      }),
    )
    .nullable(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

/** EngineerCandidateDTO. */
export const candidateSchema = z.object({
  engineerId: z.string(),
  similarIncidentCount: z.number(),
  bestSimilarity: z.number(),
  activeIncidents: z.number(),
  expertiseScore: z.number(),
  slaSuccessRate: z.number(),
  statsAvailable: z.boolean(),
  finalRankingScore: z.number(),
});
export type EngineerCandidate = z.infer<typeof candidateSchema>;

/** Proposed, BCR-13. */
export const slaPolicySchema = z.array(
  z.object({
    priority: prioritySchema,
    assignWithinSeconds: z.number(),
    resolveWithinSeconds: z.number(),
  }),
);

export type IncidentScope = 'createdByMe' | 'assignedToMe' | 'assignedByMe';

/** IncidentSuggestionNeededDTO and EngineerRecommendationRequestDTO. */
export interface AiIncidentText {
  title: string;
  description: string;
  category?: string | null | undefined;
  serviceName?: string | null | undefined;
}
