import { http as mswHttp, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import * as auth from '@/features/auth/api';
import * as incidents from '@/features/incidents/api';
import * as notifications from '@/features/notifications/api';
import * as reporting from '@/features/reporting/api';
import * as users from '@/features/users/api';
import { handlers } from '@/mocks/handlers';
import { ENDPOINTS } from '@/shared/lib/api/endpoints';
import { env } from '@/shared/lib/env';
import { ApiError } from '@/shared/lib/http/errors';
import { http } from '@/shared/lib/http';
import { server } from './server';

// Every API call the pages make, run against the sample data and through the real Zod schemas.
// The same schemas check real backend answers, so these also prove the app's mapping is complete.

const ENGINEER = 'ravi.sharma@imp.example';
const SUPERVISOR = 'meera.patel@imp.example';
const ADMIN = 'dana.kim@imp.example';
const signIn = (email: string) => auth.signIn({ email, password: 'password' });

beforeEach(() => {
  localStorage.clear();
  server.use(...handlers);
});

describe('API calls and their response shapes', () => {
  it('auth: a wrong password keeps the backend error code', async () => {
    await expect(auth.signIn({ email: ADMIN, password: 'wrong-one' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
    expect(http.getAccessToken()).toBeNull();
  });

  it('auth: sign in stores the token, and restoring a session gets a new one', async () => {
    await signIn(ENGINEER);
    expect(http.getAccessToken()).toBeTruthy();
    http.setAccessToken(null);
    await auth.restoreSession();
    expect(http.getAccessToken()).toBeTruthy();
  });

  it('incidents: list, read, create, edit, status, assign, audit, SLA and AI', async () => {
    await signIn(SUPERVISOR);
    const page = await incidents.fetchIncidents({ page: 0, size: 5 });
    expect(page.content).toHaveLength(5);
    expect(page.totalElements).toBeGreaterThan(5);

    const { incidentId } = await incidents.createIncident({
      title: 'Contract test',
      description: 'Created by a test',
      severity: 'LOW',
      priority: 'LOW',
      environment: 'LOCAL',
      serviceName: 'OTHERS',
      category: 'OTHER',
    });
    const created = await incidents.fetchIncident(incidentId);
    expect(created.incidentStatus).toBe('OPEN');

    await incidents.updateIncident(incidentId, {
      title: 'Renamed',
      description: 'Created by a test',
      severity: 'HIGH',
      priority: 'HIGH',
      environment: 'LOCAL',
    });
    expect((await incidents.fetchIncident(incidentId)).title).toBe('Renamed');

    await incidents.assignIncident(incidentId, '00000004-0000-4000-8000-000000000000');
    expect((await incidents.fetchIncident(incidentId)).incidentStatus).toBe('ASSIGNED');

    await expect(
      incidents.changeIncidentStatus(incidentId, { status: 'RESOLVED' }),
    ).rejects.toMatchObject({ code: 'ROOT_CAUSE_REQUIRED' });
    await incidents.changeIncidentStatus(incidentId, {
      status: 'RESOLVED',
      rootCause: 'A cause',
      resolutionNotes: 'A fix',
    });
    expect((await incidents.fetchIncident(incidentId)).incidentStatus).toBe('RESOLVED');

    expect((await incidents.fetchAudit(incidentId)).length).toBeGreaterThan(1);
    expect(await incidents.fetchSla([incidentId])).toHaveLength(1);
    expect((await incidents.fetchSlaPolicy()).length).toBe(4);

    const text = { title: 'Payments down', description: 'Checkout fails' };
    expect((await incidents.fetchSuggestion(text)).status).toBe('OK');
    expect((await incidents.fetchEngineerRecommendations(text)).length).toBeGreaterThan(0);
  }, 20_000); // The sample AI answers slowly on purpose, like the real thing.

  it('an engineer sees only their own incidents', async () => {
    await signIn(ENGINEER);
    const me = '00000004-0000-4000-8000-000000000000';
    const page = await incidents.fetchIncidents({ page: 0, size: 100 });
    expect(page.content.length).toBeGreaterThan(0);
    page.content.forEach((row) => {
      expect([row.createdBy, row.assignedTo]).toContain(me);
    });
  });

  it('reports: all four calls work for a supervisor', async () => {
    await signIn(SUPERVISOR);
    expect((await reporting.fetchMetrics()).totalIncidents).toBeGreaterThan(0);
    expect(await reporting.fetchTrends(7)).toHaveLength(7);
    expect((await reporting.fetchTopServices()).length).toBeGreaterThan(0);
    const rows = await reporting.fetchReportRows({ page: 0, size: 5, status: 'OPEN' });
    rows.content.forEach((row) => {
      expect(row.status).toBe('OPEN');
    });
  });

  it('reports: an engineer is refused, the same as the real backend', async () => {
    await signIn(ENGINEER);
    await expect(reporting.fetchMetrics()).rejects.toMatchObject({ status: 403 });
  });

  it('notifications: the backend shape, which is not a Spring Page', async () => {
    await signIn(ENGINEER);
    const result = await notifications.fetchNotifications(0, 5);
    expect(result.items).toHaveLength(5);
    expect(result.total).toBeGreaterThan(5);
  });

  it('users: lists, names, workload, summaries, status, roles and supervisor', async () => {
    await signIn(ADMIN);
    const engineers = await users.fetchEngineers();
    const supervisors = await users.fetchSupervisors();
    const target = engineers[0];
    const boss = supervisors[1];
    if (!target || !boss) throw new Error('Sample data is missing people');

    expect(await users.fetchUserNames([target.userid])).toEqual([
      { userid: target.userid, username: target.username },
    ]);
    expect((await users.fetchWorkload(target.userid)).engineerId).toBe(target.userid);
    expect(await users.fetchSummaries([target.userid])).toHaveLength(1);
    await users.setEngineerStatus(target.userid, 'ACTIVE');
    await users.setSupervisorStatus(boss.userid, 'ACTIVE');
    await users.setRoles(target.username, ['ROLE_ENGINEER']);
    const original = target.supervisorId ?? boss.userid;
    await users.assignSupervisor(target.userid, boss.userid);
    await users.removeSupervisor(target.userid);
    await users.assignSupervisor(target.userid, original);
  });

  // BCR-05: the backend refuses more than 100 ids in one call, so a long list goes in several calls.
  it('users: a long list of ids is asked for in calls of at most 100', async () => {
    await signIn(ADMIN);
    const sizes: number[] = [];
    server.use(
      mswHttp.post(`${env.apiBaseUrl}${ENDPOINTS.users.lookup}`, async ({ request }) => {
        const body = (await request.json()) as { ids: string[] };
        sizes.push(body.ids.length);
        return HttpResponse.json(body.ids.slice(0, 1).map((userid) => ({ userid, username: 'x' })));
      }),
    );
    const ids = Array.from({ length: 250 }, (_, index) => `id-${String(index)}`);

    const names = await users.fetchUserNames(ids);

    expect([...sizes].sort((a, b) => b - a)).toEqual([100, 100, 50]);
    expect(names).toHaveLength(3);
  });

  it('users: an admin cannot remove their own admin role', async () => {
    await signIn(ADMIN);
    await expect(users.setRoles('Dana Kim', ['ROLE_ENGINEER'])).rejects.toBeInstanceOf(ApiError);
  });
});
