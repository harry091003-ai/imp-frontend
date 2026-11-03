export const ROUTES = {
  signIn: '/login',
  dashboard: '/dashboard',
  myWork: '/my-work',
  incidents: '/incidents',
  newIncident: '/incidents/new',
  incident: (id: string) => `/incidents/${id}`,
  alerts: '/alerts',
  team: '/team',
  reports: '/reports',
  adminUsers: '/admin/users',
  account: '/settings/account',
} as const;
