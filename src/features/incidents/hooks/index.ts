import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { backendSupports } from '@/shared/lib/api/capabilities';
import {
  assignIncident,
  changeIncidentStatus,
  createIncident,
  fetchAudit,
  fetchEngineerRecommendations,
  fetchIncident,
  fetchIncidents,
  fetchSla,
  fetchSlaPolicy,
  fetchSuggestion,
  updateIncident,
  type IncidentListParams,
  type StatusChange,
} from '../api';
import type {
  AiIncidentText,
  CreateIncidentInput,
  IncidentSla,
  UpdateIncidentInput,
} from '../types';

const ROOT = 'incidents';

export function useIncidents(params: IncidentListParams) {
  return useQuery({
    queryKey: [ROOT, 'list', params],
    queryFn: () => fetchIncidents(params),
    placeholderData: keepPreviousData,
  });
}

export function useIncident(id: string) {
  return useQuery({ queryKey: [ROOT, 'one', id], queryFn: () => fetchIncident(id) });
}

export function useAudit(id: string, enabled: boolean) {
  return useQuery({ queryKey: [ROOT, 'audit', id], queryFn: () => fetchAudit(id), enabled });
}

/** SLA for many incidents in one call. Empty until the backend can answer (BCR-07). */
export function useSla(ids: string[]): Map<string, IncidentSla> {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  const query = useQuery({
    queryKey: [ROOT, 'sla', sorted],
    queryFn: () => fetchSla(sorted),
    enabled: backendSupports('slaData') && sorted.length > 0,
  });
  return useMemo(
    () => new Map((query.data ?? []).map((row) => [row.incidentId, row])),
    [query.data],
  );
}

export function useSlaPolicy() {
  return useQuery({
    queryKey: [ROOT, 'sla-policy'],
    queryFn: fetchSlaPolicy,
    enabled: backendSupports('slaPolicy'),
    staleTime: Infinity,
  });
}

function useInvalidateIncidents() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: [ROOT] });
}

export function useCreateIncident() {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: (input: CreateIncidentInput) => createIncident(input),
    onSuccess: invalidate,
  });
}

export function useUpdateIncident(id: string) {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: (input: UpdateIncidentInput) => updateIncident(id, input),
    onSuccess: invalidate,
  });
}

export function useChangeStatus(id: string) {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: (change: StatusChange) => changeIncidentStatus(id, change),
    onSuccess: invalidate,
  });
}

export function useAssignIncident(id: string) {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: (engineerId: string) => assignIncident(id, engineerId),
    onSuccess: invalidate,
  });
}

// AI calls are paid and limited to 5 a minute, so they run only when a person presses the button.
export function useSuggestion() {
  return useMutation({ mutationFn: (input: AiIncidentText) => fetchSuggestion(input) });
}

export function useEngineerRecommendations() {
  return useMutation({
    mutationFn: (input: AiIncidentText) => fetchEngineerRecommendations(input),
  });
}
