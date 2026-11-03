import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { backendSupports } from '@/shared/lib/api/capabilities';
import type { Role, UserStatus } from '@/shared/lib/constants/domain';
import {
  assignSupervisor,
  fetchEngineers,
  fetchSummaries,
  fetchSupervisors,
  fetchUserNames,
  fetchWorkload,
  removeSupervisor,
  setEngineerStatus,
  setRoles,
  setSupervisorStatus,
} from '../api';

const ROOT = 'users';

/** Everything people-related changes rarely, so five minutes of cache saves many requests. */
const LONG_STALE = 5 * 60_000;

export type UserNames = ReadonlyMap<string, string>;

/** Turns user ids into names in one call. Empty until the backend can answer (BCR-05). */
export function useUserNames(ids: readonly (string | null | undefined)[]): UserNames {
  const sorted = useMemo(
    () => [...new Set(ids.filter((id): id is string => Boolean(id)))].sort(),
    [ids],
  );
  const query = useQuery({
    queryKey: [ROOT, 'names', sorted],
    queryFn: () => fetchUserNames(sorted),
    enabled: backendSupports('userNames') && sorted.length > 0,
    staleTime: LONG_STALE,
  });
  return useMemo(
    () => new Map((query.data ?? []).map((row) => [row.userid, row.username])),
    [query.data],
  );
}

export function useEngineers(enabled = true) {
  return useQuery({
    queryKey: [ROOT, 'engineers'],
    queryFn: fetchEngineers,
    enabled,
    staleTime: LONG_STALE,
  });
}

export function useSupervisors(enabled = true) {
  return useQuery({
    queryKey: [ROOT, 'supervisors'],
    queryFn: fetchSupervisors,
    enabled,
    staleTime: LONG_STALE,
  });
}

export function useWorkloads(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [ROOT, 'workload', id],
      queryFn: () => fetchWorkload(id),
    })),
  });
}

export function useSummaries(ids: string[]) {
  return useQuery({
    queryKey: [ROOT, 'summaries', ids],
    queryFn: () => fetchSummaries(ids),
    enabled: backendSupports('engineerSummaries') && ids.length > 0,
  });
}

function useUserMutation<T>(mutationFn: (input: T) => Promise<void>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries({ queryKey: [ROOT] }),
  });
}

export function useSetUserStatus() {
  return useUserMutation(
    ({ id, status, supervisor }: { id: string; status: UserStatus; supervisor: boolean }) =>
      supervisor ? setSupervisorStatus(id, status) : setEngineerStatus(id, status),
  );
}

export function useSetRoles() {
  return useUserMutation(({ username, roles }: { username: string; roles: Role[] }) =>
    setRoles(username, roles),
  );
}

export function useSetSupervisor() {
  return useUserMutation(
    ({ engineerId, supervisorId }: { engineerId: string; supervisorId: string | null }) =>
      supervisorId ? assignSupervisor(engineerId, supervisorId) : removeSupervisor(engineerId),
  );
}
