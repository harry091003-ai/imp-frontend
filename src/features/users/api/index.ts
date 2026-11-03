import { z } from 'zod';
import { ENDPOINTS } from '@/shared/lib/api/endpoints';
import { parseResponse } from '@/shared/lib/api/schemas';
import type { Role, UserStatus } from '@/shared/lib/constants/domain';
import { http } from '@/shared/lib/http';
import { summarySchema, userNameSchema, userSchema, workloadSchema } from '../types';

export async function fetchEngineers() {
  const { data } = await http.api.get<unknown>(ENDPOINTS.users.engineers);
  return parseResponse(z.array(userSchema), data);
}

export async function fetchSupervisors() {
  const { data } = await http.api.get<unknown>(ENDPOINTS.users.supervisors);
  return parseResponse(z.array(userSchema), data);
}

/** The backend takes at most 100 ids per call (BCR-05). */
export const USER_LOOKUP_MAX_IDS = 100;

/** BCR-05. A longer list is sent as several calls of at most 100 ids, then joined. */
export async function fetchUserNames(ids: string[]) {
  const batches: string[][] = [];
  for (let start = 0; start < ids.length; start += USER_LOOKUP_MAX_IDS) {
    batches.push(ids.slice(start, start + USER_LOOKUP_MAX_IDS));
  }
  const answers = await Promise.all(
    batches.map(async (batch) => {
      const { data } = await http.api.post<unknown>(ENDPOINTS.users.lookup, { ids: batch });
      return parseResponse(z.array(userNameSchema), data);
    }),
  );
  return answers.flat();
}

export async function fetchWorkload(id: string) {
  const { data } = await http.api.get<unknown>(ENDPOINTS.reports.workload(id));
  return parseResponse(workloadSchema, data);
}

/** Proposed, BCR-09. */
export async function fetchSummaries(ids: string[]) {
  const { data } = await http.api.post<unknown>(ENDPOINTS.reports.engineerSummaries, { ids });
  return parseResponse(z.array(summarySchema), data);
}

export async function setEngineerStatus(id: string, status: UserStatus) {
  await http.api.put(ENDPOINTS.users.engineerStatus(id), { status });
}

export async function setSupervisorStatus(id: string, status: UserStatus) {
  await http.api.put(ENDPOINTS.users.supervisorStatus(id), { status });
}

export async function setRoles(username: string, roles: Role[]) {
  // The field is `role`, and it replaces the whole set. This also signs the person out.
  await http.api.put(ENDPOINTS.auth.updateRoles(username), { role: roles });
}

export async function assignSupervisor(engineerId: string, supervisorId: string) {
  await http.api.put(ENDPOINTS.users.assignSupervisor, { engineerId, supervisorId });
}

export async function removeSupervisor(engineerId: string) {
  await http.api.delete(ENDPOINTS.users.removeSupervisor(engineerId));
}
