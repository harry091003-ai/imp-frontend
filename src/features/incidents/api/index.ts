import { z } from 'zod';
import { ENDPOINTS } from '@/shared/lib/api/endpoints';
import { parseResponse } from '@/shared/lib/api/schemas';
import type { IncidentStatus, Severity } from '@/shared/lib/constants/domain';
import { http } from '@/shared/lib/http';
import {
  auditSchema,
  candidateSchema,
  createdIncidentSchema,
  incidentPageSchema,
  incidentSchema,
  slaPolicySchema,
  slaSchema,
  suggestionSchema,
  type AiIncidentText,
  type CreateIncidentInput,
  type IncidentScope,
  type UpdateIncidentInput,
} from '../types';

// Gemini can take up to 60 s, and the gateway's AI route allows that. Everything else uses 15 s.
const AI_TIMEOUT_MS = 65_000;

export interface IncidentListParams {
  page: number;
  size: number;
  filter?: IncidentScope | undefined;
  /** The next three are proposed, BCR-06. The caller checks backendSupports('incidentFilters'). */
  status?: IncidentStatus | undefined;
  severity?: Severity | undefined;
  q?: string | undefined;
}

export async function fetchIncidents(params: IncidentListParams) {
  const { data } = await http.api.get<unknown>(ENDPOINTS.incidents.list, { params });
  return parseResponse(incidentPageSchema, data);
}

export async function fetchIncident(id: string) {
  const { data } = await http.api.get<unknown>(ENDPOINTS.incidents.one(id));
  return parseResponse(incidentSchema, data);
}

export async function createIncident(input: CreateIncidentInput) {
  const { data } = await http.api.post<unknown>(ENDPOINTS.incidents.list, input);
  return parseResponse(createdIncidentSchema, data);
}

export async function updateIncident(id: string, input: UpdateIncidentInput) {
  await http.api.put(ENDPOINTS.incidents.one(id), input);
}

export interface StatusChange {
  status: IncidentStatus;
  rootCause?: string;
  resolutionNotes?: string;
}

export async function changeIncidentStatus(id: string, change: StatusChange) {
  await http.api.put(ENDPOINTS.incidents.status(id), change);
}

export async function assignIncident(id: string, engineerId: string) {
  // `enginerId` is the backend's real spelling.
  await http.api.put(ENDPOINTS.incidents.assign(id), { enginerId: engineerId });
}

export async function fetchAudit(id: string) {
  const { data } = await http.api.get<unknown>(ENDPOINTS.reports.audit(id));
  return parseResponse(z.array(auditSchema), data);
}

/** Proposed, BCR-07. */
export async function fetchSla(ids: string[]) {
  const { data } = await http.api.post<unknown>(ENDPOINTS.reports.slaLookup, { ids });
  return parseResponse(z.array(slaSchema), data);
}

/** Proposed, BCR-13. */
export async function fetchSlaPolicy() {
  const { data } = await http.api.get<unknown>(ENDPOINTS.reports.slaPolicy);
  return parseResponse(slaPolicySchema, data);
}

export async function fetchSuggestion(input: AiIncidentText) {
  const { data } = await http.api.post<unknown>(ENDPOINTS.ai.suggestion, input, {
    timeout: AI_TIMEOUT_MS,
  });
  return parseResponse(suggestionSchema, data);
}

export async function fetchEngineerRecommendations(input: AiIncidentText) {
  const { data } = await http.api.post<unknown>(ENDPOINTS.ai.recommendEngineers, input, {
    timeout: AI_TIMEOUT_MS,
  });
  return parseResponse(z.array(candidateSchema), data);
}
