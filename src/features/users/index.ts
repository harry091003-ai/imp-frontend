import { lazy } from 'react';

export { Person } from './components/Person';
export { useEngineers, useUserNames } from './hooks';
export type { UserNames } from './hooks';
export type { User } from './types';

export const TeamPage = lazy(() => import('./pages/TeamPage'));
export const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
