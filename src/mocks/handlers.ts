import { delay, http, HttpResponse, type HttpResponseResolver } from 'msw';
import { env } from '@/shared/lib/env';
import { ENDPOINTS } from '@/shared/lib/api/endpoints';
import { NEXT_STATUSES } from '@/features/incidents';
import { INCIDENT_STATUSES } from '@/shared/lib/constants/domain';
import {
  extraAudit,
  incidents,
  MOCK_PASSWORD,
  notifications,
  serverTime,
  SLA_MINUTES,
  users,
  type MockAudit,
  type MockIncident,
  type MockUser,
} from './data';

const SESSION_KEY = 'imp-mock-session';
const url = (path: string) => `${env.apiBaseUrl}${path}`;

function fail(status: number, error: string, message: string, extra: object = {}) {
  return HttpResponse.json(
    {
      timestamp: serverTime(0),
      status,
      error,
      message,
      path: '',
      traceId: crypto.randomUUID().slice(0, 8),
      ...extra,
    },
    { status },
  );
}

function tokenFor(user: MockUser): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return [
    encode({ alg: 'none' }),
    encode({ sub: user.userid, email: user.email, roles: user.roles }),
    'mock',
  ].join('.');
}

function userFromRequest(request: Request): MockUser | undefined {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  try {
    const claims = JSON.parse(atob(token.split('.')[1] ?? '')) as { sub: string };
    return users.find((user) => user.userid === claims.sub);
  } catch {
    return undefined;
  }
}

const is = (user: MockUser, role: string) => user.roles.includes(role);
const isAdmin = (user: MockUser) => is(user, 'ROLE_ADMIN');
const isManager = (user: MockUser) => isAdmin(user) || is(user, 'ROLE_SUPERVISOR');
const teamOf = (supervisorId: string) =>
  users.filter((user) => user.supervisorId === supervisorId).map((user) => user.userid);
const nameOf = (id: string | null) =>
  users.find((user) => user.userid === id)?.username ?? 'Someone';

/** The same read rule as the backend: findIncidentsForUser and supervisorMayTouch. */
function mayRead(user: MockUser, incident: MockIncident): boolean {
  if (isAdmin(user)) return true;
  if (is(user, 'ROLE_SUPERVISOR')) {
    const team = teamOf(user.userid);
    return (
      incident.createdBy === user.userid ||
      incident.assignedBy === user.userid ||
      team.includes(incident.createdBy) ||
      (incident.assignedTo !== null && team.includes(incident.assignedTo))
    );
  }
  return incident.createdBy === user.userid || incident.assignedTo === user.userid;
}

function paged<T>(items: T[], url_: URL, defaultSize = 20) {
  const page = Number(url_.searchParams.get('page') ?? 0);
  const size = Number(url_.searchParams.get('size') ?? defaultSize);
  return {
    content: items.slice(page * size, (page + 1) * size),
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
    number: page,
    size,
  };
}

/** Wraps a handler: a small wait, like a real network, then the login check every route has. */
function secured(
  handler: (
    args: Parameters<HttpResponseResolver>[0],
    user: MockUser,
  ) => Response | Promise<Response>,
): HttpResponseResolver {
  return async (args) => {
    await delay(150);
    const user = userFromRequest(args.request);
    if (!user) return fail(401, 'INVALID_TOKEN', 'The token is invalid or has expired.');
    return handler(args, user);
  };
}

const forbidden = () => fail(403, 'FORBIDDEN', 'You do not have permission to do this.');
const param = (args: Parameters<HttpResponseResolver>[0], name: string) =>
  String(args.params[name]);

function audit(
  incident: MockIncident,
  by: MockUser,
  eventType: string,
  oldValue: string | null,
  newValue: string | null,
) {
  extraAudit.push({
    incidentId: incident.id,
    eventId: crypto.randomUUID(),
    eventType,
    performedBy: by.userid,
    oldValue,
    newValue,
    timestamp: serverTime(0),
  });
}

function slaOf(incident: MockIncident) {
  const rule = SLA_MINUTES[incident.priority] ?? { assign: 60, resolve: 1440 };
  const created = new Date(`${incident.createdAt}Z`).getTime();
  const at = (minutes: number) => new Date(created + minutes * 60_000).toISOString().slice(0, 19);
  const now = new Date(`${serverTime(0)}Z`).getTime();
  const assigned = incident.assignedTo !== null;
  const done = ['RESOLVED', 'CLOSED'].includes(incident.incidentStatus);
  return {
    incidentId: incident.id,
    assignmentDeadline: at(rule.assign),
    resolutionDeadline: at(rule.resolve),
    assignmentSlaBreached: !assigned && now > created + rule.assign * 60_000,
    resolutionSlaBreached: !done && now > created + rule.resolve * 60_000,
    assignedAt: assigned ? at(Math.min(rule.assign / 2, 10)) : null,
    resolvedAt: done ? incident.updatedAt : null,
    startedAt: incident.createdAt,
  };
}

function reportOf(incident: MockIncident) {
  const sla = slaOf(incident);
  return {
    incidentId: incident.id,
    title: incident.title,
    severity: incident.severity,
    priority: incident.priority,
    status: incident.incidentStatus,
    serviceName: incident.serviceName,
    category: incident.category,
    createdBy: incident.createdBy,
    assignedTo: incident.assignedTo,
    assignedBy: incident.assignedBy,
    createdAt: incident.createdAt,
    assignedAt: sla.assignedAt,
    resolvedAt: sla.resolvedAt,
    timeToAssignSeconds: incident.assignedTo ? 600 : null,
    resolutionTimeSeconds: sla.resolvedAt ? 11_100 : null,
  };
}

const activeCount = (engineer: string) =>
  incidents.filter(
    (i) => i.assignedTo === engineer && !['RESOLVED', 'CLOSED'].includes(i.incidentStatus),
  ).length;

export const handlers = [
  // ---- Auth. Login also "sets the cookie", which here is a browser storage entry (BCR-02).
  http.post(url(ENDPOINTS.auth.login), async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { email: string; password: string };
    const user = users.find((candidate) => candidate.email === body.email);
    if (!user || body.password !== MOCK_PASSWORD) {
      return fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    localStorage.setItem(SESSION_KEY, user.userid);
    return HttpResponse.json({
      userid: user.userid,
      username: user.username,
      email: user.email,
      status: 200,
      message: 'Login successful',
      jwttoken: tokenFor(user),
    });
  }),

  http.post(url(ENDPOINTS.auth.signup), async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { username: string; email: string };
    if (users.some((user) => user.username === body.username)) {
      return fail(409, 'USERNAME_TAKEN', 'This username is already taken.');
    }
    if (users.some((user) => user.email === body.email)) {
      return fail(409, 'EMAIL_TAKEN', 'This email is already registered.');
    }
    users.push({
      userid: crypto.randomUUID(),
      username: body.username,
      email: body.email,
      status: 'ACTIVE',
      roles: ['ROLE_ENGINEER'],
      supervisorId: null,
      createdAt: serverTime(0),
      updatedAt: serverTime(0),
      lastLoginAt: null,
    });
    return HttpResponse.json({ username: body.username, message: 'Signup successful' });
  }),

  http.post(url('/auth/refresh'), async () => {
    await delay(100);
    const user = users.find((candidate) => candidate.userid === localStorage.getItem(SESSION_KEY));
    if (!user) {
      return fail(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is not valid. Please log in again.');
    }
    return HttpResponse.json({ userid: user.userid, jwttoken: tokenFor(user) });
  }),

  http.post(
    url(ENDPOINTS.auth.logout),
    secured(() => {
      localStorage.removeItem(SESSION_KEY);
      return HttpResponse.text('Logout Successfully');
    }),
  ),

  http.post(
    url(ENDPOINTS.auth.changePassword),
    secured(async ({ request }) => {
      const body = (await request.json()) as { oldpassword: string; newpassword: string };
      if (body.oldpassword !== MOCK_PASSWORD) {
        return fail(401, 'INVALID_OLD_PASSWORD', 'Your current password is not correct.');
      }
      if (body.newpassword === body.oldpassword) {
        return fail(
          400,
          'NEW_PASSWORD_SAME_AS_OLD',
          'Choose a password different from the old one.',
        );
      }
      localStorage.removeItem(SESSION_KEY);
      return HttpResponse.text('Password changed successfully');
    }),
  ),

  http.put(
    url(ENDPOINTS.auth.updateCredentials),
    secured(async ({ request }, user) => {
      const body = (await request.json()) as {
        newEmail?: string;
        newUsername?: string;
        password: string;
      };
      if (body.password !== MOCK_PASSWORD) {
        return fail(401, 'INVALID_PASSWORD', 'Your current password is not correct.');
      }
      if (body.newEmail) user.email = body.newEmail;
      if (body.newUsername) user.username = body.newUsername;
      localStorage.removeItem(SESSION_KEY);
      return HttpResponse.json({ message: 'Credentials updated' });
    }),
  ),

  http.put(
    url('/roles/:username/update'),
    secured(async (args, actor) => {
      if (!isAdmin(actor)) return forbidden();
      const target = users.find((user) => user.username === param(args, 'username'));
      if (!target) return fail(404, 'USER_NOT_FOUND', 'User not found.');
      const body = (await args.request.json()) as { role: string[] };
      if (target.userid === actor.userid && !body.role.includes('ROLE_ADMIN')) {
        return fail(403, 'CANNOT_REMOVE_OWN_ADMIN_ROLE', 'You cannot remove your own admin role.');
      }
      target.roles = body.role;
      return HttpResponse.json({
        userId: target.userid,
        username: target.username,
        rolename: target.roles,
        message: 'Roles updated',
      });
    }),
  ),

  // ---- Incidents
  http.get(
    url(ENDPOINTS.incidents.list),
    secured(({ request }, user) => {
      const query = new URL(request.url);
      const filter = query.searchParams.get('filter');
      if (filter === 'assignedByMe' && !isManager(user)) {
        return fail(
          403,
          'FILTER_NOT_ALLOWED',
          "The 'assignedByMe' filter is only for admins and supervisors.",
        );
      }
      const status = query.searchParams.get('status');
      const severity = query.searchParams.get('severity');
      const text = query.searchParams.get('q')?.toLowerCase();
      const rows = incidents
        .filter((incident) => mayRead(user, incident))
        .filter((incident) => filter !== 'createdByMe' || incident.createdBy === user.userid)
        .filter((incident) => filter !== 'assignedToMe' || incident.assignedTo === user.userid)
        .filter((incident) => filter !== 'assignedByMe' || incident.assignedBy === user.userid)
        .filter((incident) => !status || incident.incidentStatus === status)
        .filter((incident) => !severity || incident.severity === severity)
        .filter(
          (incident) =>
            !text || incident.title.toLowerCase().includes(text) || incident.id.startsWith(text),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return HttpResponse.json(paged(rows, query));
    }),
  ),

  http.post(
    url(ENDPOINTS.incidents.list),
    secured(async ({ request }, user) => {
      const body = (await request.json()) as Partial<MockIncident>;
      const incident: MockIncident = {
        id: crypto.randomUUID(),
        title: body.title ?? '',
        description: body.description ?? '',
        severity: body.severity ?? 'LOW',
        priority: body.priority ?? 'LOW',
        incidentStatus: 'OPEN',
        createdBy: user.userid,
        assignedTo: null,
        assignedBy: null,
        serviceName: body.serviceName ?? 'OTHERS',
        category: body.category ?? 'OTHER',
        environment: body.environment ?? 'OTHERS',
        affectedSource: body.affectedSource ?? null,
        location: body.location ?? null,
        rootCause: null,
        resolutionNotes: null,
        createdAt: serverTime(0),
        updatedAt: serverTime(0),
      };
      incidents.unshift(incident);
      audit(incident, user, 'INCIDENT_CREATED', null, 'OPEN');
      return HttpResponse.json({ incidentId: incident.id, message: 'Incident created' });
    }),
  ),

  http.get(
    url('/incidents/:id'),
    secured((args, user) => {
      const incident = incidents.find((row) => row.id === param(args, 'id'));
      if (!incident) return fail(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
      if (!mayRead(user, incident))
        return fail(403, 'INCIDENT_ACCESS_DENIED', 'You do not have access to this incident.');
      return HttpResponse.json(incident);
    }),
  ),

  http.put(
    url('/incidents/:id'),
    secured(async (args, user) => {
      const incident = incidents.find((row) => row.id === param(args, 'id'));
      if (!incident) return fail(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
      if (!mayRead(user, incident))
        return fail(403, 'INCIDENT_UPDATE_DENIED', 'You may not edit this incident.');
      Object.assign(incident, await args.request.json(), { updatedAt: serverTime(0) });
      audit(incident, user, 'INCIDENT_METADATA_UPDATED', null, null);
      return HttpResponse.json({ id: incident.id, message: 'Incident updated' });
    }),
  ),

  http.put(
    url('/incidents/:id/status'),
    secured(async (args, user) => {
      const incident = incidents.find((row) => row.id === param(args, 'id'));
      if (!incident) return fail(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
      if (!mayRead(user, incident))
        return fail(403, 'INCIDENT_STATUS_UPDATE_DENIED', 'You may not change this status.');
      const body = (await args.request.json()) as {
        status: string;
        rootCause?: string;
        resolutionNotes?: string;
      };
      // BCR-03: the same table the backend enforces.
      // The sample data keeps the status as plain text, so it is checked against the six names first.
      const current = INCIDENT_STATUSES.find((status) => status === incident.incidentStatus);
      const allowedNext: string[] = current
        ? NEXT_STATUSES[current].map((option) => option.status)
        : [];
      if (!allowedNext.includes(body.status)) {
        return fail(
          409,
          'INVALID_STATUS_TRANSITION',
          `An incident that is ${incident.incidentStatus} cannot be changed to ${body.status}.`,
        );
      }
      const rootCause = body.rootCause?.trim() ? body.rootCause : incident.rootCause;
      const notes = body.resolutionNotes?.trim() ? body.resolutionNotes : incident.resolutionNotes;
      if (body.status === 'RESOLVED' && (!rootCause || !notes)) {
        return fail(
          400,
          'ROOT_CAUSE_REQUIRED',
          'To resolve an incident, give a root cause and resolution notes.',
        );
      }
      audit(incident, user, 'INCIDENT_STATUS_UPDATED', incident.incidentStatus, body.status);
      Object.assign(incident, {
        incidentStatus: body.status,
        rootCause,
        resolutionNotes: notes,
        updatedAt: serverTime(0),
      });
      return HttpResponse.json({
        id: incident.id,
        updatedStatus: body.status,
        message: 'Status updated',
      });
    }),
  ),

  http.put(
    url('/incidents/:id/assign'),
    secured(async (args, user) => {
      if (!isManager(user)) return forbidden();
      const incident = incidents.find((row) => row.id === param(args, 'id'));
      if (!incident) return fail(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
      const body = (await args.request.json()) as { enginerId: string };
      const engineer = users.find((row) => row.userid === body.enginerId);
      if (['RESOLVED', 'CLOSED'].includes(incident.incidentStatus)) {
        return fail(409, 'INCIDENT_ALREADY_CLOSED', 'This incident is already resolved or closed.');
      }
      if (incident.assignedTo === body.enginerId) {
        return fail(
          409,
          'ALREADY_ASSIGNED_TO_THIS_ENGINEER',
          'It is already assigned to this engineer.',
        );
      }
      if (engineer?.status !== 'ACTIVE')
        return fail(400, 'ENGINEER_NOT_ACTIVE', 'This engineer is not active.');
      if (!isAdmin(user) && engineer.supervisorId !== user.userid) {
        return fail(403, 'ENGINEER_NOT_IN_YOUR_TEAM', 'This engineer is not on your team.');
      }
      audit(incident, user, 'INCIDENT_ASSIGNED', incident.assignedTo, engineer.userid);
      Object.assign(incident, {
        assignedTo: engineer.userid,
        assignedBy: user.userid,
        incidentStatus: 'ASSIGNED',
        updatedAt: serverTime(0),
      });
      return HttpResponse.json({
        incidentid: incident.id,
        enginerId: engineer.userid,
        assignedBy: user.userid,
        message: 'Incident assigned',
      });
    }),
  ),

  // ---- Users
  http.get(
    url(ENDPOINTS.users.me),
    secured((_args, user) => HttpResponse.json(user)),
  ),
  http.get(
    url(ENDPOINTS.users.engineers),
    secured((_args, user) =>
      isManager(user)
        ? HttpResponse.json(users.filter((row) => row.roles.includes('ROLE_ENGINEER')))
        : forbidden(),
    ),
  ),
  http.get(
    url(ENDPOINTS.users.supervisors),
    secured((_args, user) =>
      isAdmin(user)
        ? HttpResponse.json(users.filter((row) => row.roles.includes('ROLE_SUPERVISOR')))
        : forbidden(),
    ),
  ),
  // Proposed, BCR-05.
  http.post(
    url(ENDPOINTS.users.lookup),
    secured(async ({ request }) => {
      const body = (await request.json()) as { ids: string[] };
      return HttpResponse.json(
        users
          .filter((user) => body.ids.includes(user.userid))
          .map(({ userid, username }) => ({ userid, username })),
      );
    }),
  ),
  http.put(
    url('/users/:id/statusEngineer'),
    secured(async (args, actor) => {
      if (!isManager(actor)) return forbidden();
      const target = users.find((user) => user.userid === param(args, 'id'));
      if (!target) return fail(404, 'USER_NOT_FOUND', 'User not found.');
      target.status = ((await args.request.json()) as { status: MockUser['status'] }).status;
      return HttpResponse.json({ ...target, message: 'Status updated' });
    }),
  ),
  http.put(
    url('/users/:id/statusSupervisor'),
    secured(async (args, actor) => {
      if (!isAdmin(actor)) return forbidden();
      const target = users.find((user) => user.userid === param(args, 'id'));
      if (!target) return fail(404, 'USER_NOT_FOUND', 'User not found.');
      target.status = ((await args.request.json()) as { status: MockUser['status'] }).status;
      return HttpResponse.json({ ...target, message: 'Status updated' });
    }),
  ),
  http.put(
    url(ENDPOINTS.users.assignSupervisor),
    secured(async ({ request }, actor) => {
      if (!isAdmin(actor)) return forbidden();
      const body = (await request.json()) as { engineerId: string; supervisorId: string };
      const target = users.find((user) => user.userid === body.engineerId);
      if (!target) return fail(404, 'USER_NOT_FOUND', 'User not found.');
      target.supervisorId = body.supervisorId;
      return HttpResponse.json({ successMessage: 'Supervisor assigned', errorMessage: 'No Error' });
    }),
  ),
  http.delete(
    url('/users/engineer/:id/supervisor'),
    secured((args, actor) => {
      if (!isAdmin(actor)) return forbidden();
      const target = users.find((user) => user.userid === param(args, 'id'));
      if (!target) return fail(404, 'USER_NOT_FOUND', 'User not found.');
      target.supervisorId = null;
      return HttpResponse.json({ successMessage: 'Supervisor removed', errorMessage: 'No Error' });
    }),
  ),

  // ---- Reports: ADMIN and SUPERVISOR only, as in ReportingService's SecurityConfig.
  http.get(
    url(ENDPOINTS.reports.metrics),
    secured((_args, user) => {
      if (!isManager(user)) return forbidden();
      const sla = incidents.map(slaOf);
      return HttpResponse.json({
        totalIncidents: incidents.length,
        openIncidents: incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.incidentStatus))
          .length,
        resolvedIncidents: incidents.filter((i) =>
          ['RESOLVED', 'CLOSED'].includes(i.incidentStatus),
        ).length,
        avgResolutionTime: 11_100,
        avgAssignmentTime: 1_080,
        assignmentSLA_BreachedCount: sla.filter((row) => row.assignmentSlaBreached).length,
        resolutionSLA_BreachedCount: sla.filter((row) => row.resolutionSlaBreached).length,
      });
    }),
  ),
  http.get(
    url(ENDPOINTS.reports.trends),
    secured(({ request }, user) => {
      if (!isManager(user)) return forbidden();
      const days = Number(new URL(request.url).searchParams.get('days') ?? 7);
      return HttpResponse.json(
        Array.from({ length: days }, (_, index) => ({
          incidentsDate: serverTime(-(days - 1 - index) * 1440).slice(0, 10),
          count: Math.max(
            1,
            Math.round(9 + 4 * Math.sin(index * 0.85) + 3 * Math.sin(index * 0.31 + 1.2)),
          ),
        })),
      );
    }),
  ),
  http.get(
    url(ENDPOINTS.reports.topServices),
    secured((_args, user) => {
      if (!isManager(user)) return forbidden();
      const counts = new Map<string, number>();
      incidents.forEach((i) => counts.set(i.serviceName, (counts.get(i.serviceName) ?? 0) + 1));
      return HttpResponse.json(
        [...counts]
          .map(([serviceName, count]) => ({ serviceName, count }))
          .sort((a, b) => b.count - a.count),
      );
    }),
  ),
  http.get(
    url(ENDPOINTS.reports.incidents),
    secured(({ request }, user) => {
      if (!isManager(user)) return forbidden();
      const query = new URL(request.url);
      const status = query.searchParams.get('status');
      const severity = query.searchParams.get('severity');
      // The real endpoint sorts oldest first (ReportingService.getIncidents).
      const rows = incidents
        .filter((i) => !status || i.incidentStatus === status)
        .filter((i) => !severity || i.severity === severity)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(reportOf);
      return HttpResponse.json(paged(rows, query));
    }),
  ),
  http.get(
    url('/reports/incidents/:id/audit'),
    secured((args, user) => {
      const incident = incidents.find((row) => row.id === param(args, 'id'));
      if (!incident) return fail(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
      // Proposed, BCR-08: today the real endpoint is ADMIN and SUPERVISOR only.
      if (!isManager(user) && !mayRead(user, incident)) return forbidden();
      const history: MockAudit[] = [
        {
          incidentId: incident.id,
          eventId: crypto.randomUUID(),
          eventType: 'INCIDENT_CREATED',
          performedBy: incident.createdBy,
          oldValue: null,
          newValue: 'OPEN',
          timestamp: incident.createdAt,
        },
      ];
      if (incident.assignedTo) {
        history.push({
          incidentId: incident.id,
          eventId: crypto.randomUUID(),
          eventType: 'INCIDENT_ASSIGNED',
          performedBy: incident.assignedBy ?? incident.createdBy,
          oldValue: null,
          newValue: nameOf(incident.assignedTo),
          timestamp: incident.updatedAt,
        });
      }
      return HttpResponse.json([
        ...history,
        ...extraAudit.filter((row) => row.incidentId === incident.id),
      ]);
    }),
  ),
  http.get(
    url('/reports/engineer-workload/:id'),
    secured((args, user) => {
      if (!isManager(user)) return forbidden();
      const id = param(args, 'id');
      return HttpResponse.json({
        engineerId: id,
        activeIncidentCount: activeCount(id),
        lastAssignedAt: serverTime(-120),
        updatedAt: serverTime(-30),
      });
    }),
  ),
  // Proposed, BCR-07.
  http.post(
    url(ENDPOINTS.reports.slaLookup),
    secured(async ({ request }, user) => {
      const body = (await request.json()) as { ids: string[] };
      return HttpResponse.json(
        incidents.filter((i) => body.ids.includes(i.id) && mayRead(user, i)).map(slaOf),
      );
    }),
  ),
  // Proposed, BCR-09.
  http.post(
    url(ENDPOINTS.reports.engineerSummaries),
    secured(async ({ request }, user) => {
      if (!isManager(user)) return forbidden();
      const body = (await request.json()) as { ids: string[] };
      return HttpResponse.json(
        body.ids.map((engineerId, index) => ({
          engineerId,
          totalIncidentsResolved: 12 + index * 5,
          avgResolutionTimeSeconds: 7_200 + index * 2_400,
          slaSuccessRate: 0.97 - index * 0.04,
          expertiseScore: 0.91 - index * 0.07,
        })),
      );
    }),
  ),
  // Proposed, BCR-13.
  http.get(
    url(ENDPOINTS.reports.slaPolicy),
    secured(() =>
      HttpResponse.json(
        Object.entries(SLA_MINUTES).map(([priority, rule]) => ({
          priority,
          assignWithinSeconds: rule.assign * 60,
          resolveWithinSeconds: rule.resolve * 60,
        })),
      ),
    ),
  ),

  // ---- Notifications: not a Spring Page, the backend sends {total, page, size, items}.
  http.get(
    url(ENDPOINTS.notifications.mine),
    secured(({ request }, user) => {
      const query = new URL(request.url);
      const page = Number(query.searchParams.get('page') ?? 0);
      const size = Number(query.searchParams.get('size') ?? 20);
      const mine = notifications
        .filter((note) => note.recipientId === user.userid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return HttpResponse.json({
        total: mine.length,
        page,
        size,
        items: mine
          .slice(page * size, (page + 1) * size)
          .map(({ id, incidentId, type, status, message, createdAt }) => ({
            id,
            incidentId,
            type,
            status,
            message,
            createdAt,
          })),
      });
    }),
  ),

  // ---- AI. Runs slowly on purpose, because real Gemini calls take seconds.
  http.post(
    url(ENDPOINTS.ai.suggestion),
    secured(async ({ request }) => {
      await delay(1200);
      const body = (await request.json()) as { title: string };
      if (body.title.toLowerCase().includes('nothing similar')) {
        return HttpResponse.json({
          status: 'NOT_ENOUGH_SIMILAR_INCIDENTS',
          rootCause: null,
          resolutionNotes: null,
          sameCategoryAndService: false,
          sources: [],
        });
      }
      return HttpResponse.json({
        status: 'OK',
        rootCause: 'Database connection pool exhausted after a recent deploy.',
        resolutionNotes:
          'Raise the pool limit, restart the affected pods, then watch the error rate.',
        sameCategoryAndService: true,
        sources: [incidents[10], incidents[18], incidents[15]].map((incident, index) => ({
          incidentId: incident?.id ?? '',
          similarity: 0.91 - index * 0.06,
          resolvedBy: incident?.assignedTo ?? '',
          resolvedAt: incident?.updatedAt ?? '',
        })),
      });
    }),
  ),
  http.post(
    url(ENDPOINTS.ai.recommendEngineers),
    secured(async (_args, user) => {
      if (!isManager(user)) return forbidden();
      await delay(1200);
      const pool = users.filter(
        (row) =>
          row.roles.includes('ROLE_ENGINEER') &&
          row.status === 'ACTIVE' &&
          (isAdmin(user) || row.supervisorId === user.userid),
      );
      return HttpResponse.json(
        pool.map((engineer, index) => ({
          engineerId: engineer.userid,
          similarIncidentCount: Math.max(0, 6 - index * 2),
          bestSimilarity: 0.92 - index * 0.08,
          activeIncidents: activeCount(engineer.userid),
          expertiseScore: 0.91 - index * 0.07,
          slaSuccessRate: 0.97 - index * 0.04,
          statsAvailable: true,
          finalRankingScore: 0.94 - index * 0.11,
        })),
      );
    }),
  ),
];
