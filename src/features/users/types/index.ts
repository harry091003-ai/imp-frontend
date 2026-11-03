import { z } from 'zod';
import { USER_STATUS_LABELS, type UserStatus } from '@/shared/lib/constants/domain';

const STATUSES = Object.keys(USER_STATUS_LABELS) as [UserStatus, ...UserStatus[]];

/** UserResponseDTO. */
export const userSchema = z.object({
  userid: z.string(),
  username: z.string(),
  email: z.string(),
  status: z.enum(STATUSES),
  roles: z.array(z.string()),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  supervisorId: z.string().nullable(),
});
export type User = z.infer<typeof userSchema>;

/** Proposed, BCR-05. */
export const userNameSchema = z.object({ userid: z.string(), username: z.string() });

/** EngineerWorkloadDTO. */
export const workloadSchema = z.object({
  engineerId: z.string(),
  activeIncidentCount: z.number(),
  lastAssignedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});
export type Workload = z.infer<typeof workloadSchema>;

/** Proposed, BCR-09. */
export const summarySchema = z.object({
  engineerId: z.string(),
  totalIncidentsResolved: z.number(),
  avgResolutionTimeSeconds: z.number(),
  slaSuccessRate: z.number(),
  expertiseScore: z.number(),
});
export type EngineerSummary = z.infer<typeof summarySchema>;
