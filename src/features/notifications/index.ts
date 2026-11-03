import { lazy } from 'react';

export { AlertIcon, alertLabel } from './components/AlertIcon';
export { useLatestAlerts, useNewAlertCount } from './hooks';
export { alertLink } from './types';

export const AlertsPage = lazy(() => import('./pages/AlertsPage'));
