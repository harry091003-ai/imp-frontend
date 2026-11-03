import { lazy } from 'react';

export { useRestoreSession, useSignOut } from './hooks';

export const SignInPage = lazy(() => import('./pages/SignInPage'));
export const AccountPage = lazy(() => import('./pages/AccountPage'));
