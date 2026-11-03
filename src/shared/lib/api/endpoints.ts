// Every backend URL the frontend calls, in one place. These are the REAL paths. Mock mode answers
// the same paths, so moving to real data needs no change in any page.

const encode = encodeURIComponent;

export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    logout: '/logout/user',
    changePassword: '/password/update',
    updateCredentials: '/credentials/profile',
    updateRoles: (username: string) => `/roles/${encode(username)}/update`,
  },
  incidents: {
    list: '/incidents',
    one: (id: string) => `/incidents/${encode(id)}`,
    status: (id: string) => `/incidents/${encode(id)}/status`,
    assign: (id: string) => `/incidents/${encode(id)}/assign`,
  },
  users: {
    me: '/users/me',
    engineers: '/users/engineers',
    supervisors: '/users/supervisors',
    search: '/users/search',
    engineerStatus: (id: string) => `/users/${encode(id)}/statusEngineer`,
    supervisorStatus: (id: string) => `/users/${encode(id)}/statusSupervisor`,
    assignSupervisor: '/users/engineer/supervisor',
    removeSupervisor: (id: string) => `/users/engineer/${encode(id)}/supervisor`,
    /** Proposed, BCR-05. */
    lookup: '/users/lookup',
  },
  reports: {
    metrics: '/reports/metrics',
    daily: '/reports/metrics/daily',
    trends: '/reports/trends',
    topServices: '/reports/top-services/failing',
    incidents: '/reports/incidents',
    audit: (id: string) => `/reports/incidents/${encode(id)}/audit`,
    workload: (id: string) => `/reports/engineer-workload/${encode(id)}`,
    /** Proposed, BCR-07. */
    slaLookup: '/reports/sla/lookup',
    /** Proposed, BCR-09. */
    engineerSummaries: '/reports/engineer-summaries',
    /** Proposed, BCR-13. */
    slaPolicy: '/reports/sla-policy',
  },
  notifications: {
    mine: '/notifications/me',
  },
  ai: {
    suggestion: '/ai/rag/suggestion',
    recommendEngineers: '/ai/EngineersSuggestion-ForIncidentAssignment',
  },
} as const;
