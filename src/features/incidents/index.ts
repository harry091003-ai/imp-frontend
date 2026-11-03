import { lazy } from 'react';

export { IncidentSlaBadge } from './components/IncidentSlaBadge';
export { NEXT_STATUSES } from './components/statusFlow';
export { useIncidents, useSla } from './hooks';
export type { IncidentSla } from './types';

export const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
export const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage'));
export const NewIncidentPage = lazy(() => import('./pages/NewIncidentPage'));
export const EngineerHomePage = lazy(() => import('./pages/EngineerHomePage'));
