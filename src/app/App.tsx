import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider } from 'react-router';
import { AccountPage, SignInPage, useRestoreSession } from '@/features/auth';
import {
  EngineerHomePage,
  IncidentDetailPage,
  IncidentsPage,
  NewIncidentPage,
} from '@/features/incidents';
import { AlertsPage } from '@/features/notifications';
import { DashboardPage, ReportsPage } from '@/features/reporting';
import { AdminUsersPage, TeamPage } from '@/features/users';
import type { Role } from '@/shared/lib/constants/domain';
import { ROUTES } from '@/shared/lib/constants/routes';
import { useSession } from '@/shared/lib/session';
import { Button, EmptyState, ErrorState, Skeleton, ToastProvider } from '@/shared/ui';
import { AppShell } from './AppShell';

// The http client already retries safe GETs once in one place. A second layer would multiply calls.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false } },
});

// Development only. The build removes this branch, so it never reaches real users.
const UiGallery = import.meta.env.DEV
  ? lazy(() => import('./dev/UiGallery').then((module) => ({ default: module.UiGallery })))
  : null;

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <Skeleton className="h-2 w-40" />
    </div>
  );
}

function RequireSignIn() {
  const session = useSession();
  if (session.status === 'loading') return <Loading />;
  if (session.status === 'anonymous') return <Navigate to={ROUTES.signIn} replace />;
  return <AppShell />;
}

/** This only decides which screens to show. The backend is what actually enforces access. */
function RequireRole({ roles }: { roles: readonly Role[] }) {
  const session = useSession();
  if (session.status !== 'authenticated') return null;
  if (!session.user.roles.some((role) => roles.includes(role))) {
    return (
      <EmptyState
        title="You do not have access to this page"
        description="Ask an admin if you think you should."
        action={
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
        }
      />
    );
  }
  return <Outlet />;
}

function Home() {
  const session = useSession();
  if (session.status !== 'authenticated') return null;
  return (
    <Navigate
      to={session.user.role === 'ROLE_ENGINEER' ? ROUTES.myWork : ROUTES.dashboard}
      replace
    />
  );
}

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="This page does not exist or has moved."
      action={
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      }
    />
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorState
        title="This page stopped working"
        message="Reload to try again. Your saved work is safe."
        onRetry={() => {
          location.reload();
        }}
      />
    );
  }
}

const MANAGERS: readonly Role[] = ['ROLE_ADMIN', 'ROLE_SUPERVISOR'];

const router = createBrowserRouter([
  ...(UiGallery ? [{ path: '/ui', element: <UiGallery /> }] : []),
  { path: ROUTES.signIn, element: <SignInPage /> },
  {
    element: <RequireSignIn />,
    children: [
      { index: true, path: '/', element: <Home /> },
      { path: ROUTES.myWork, element: <EngineerHomePage /> },
      { path: ROUTES.incidents, element: <IncidentsPage /> },
      { path: ROUTES.newIncident, element: <NewIncidentPage /> },
      { path: `${ROUTES.incidents}/:id`, element: <IncidentDetailPage /> },
      { path: ROUTES.alerts, element: <AlertsPage /> },
      { path: ROUTES.account, element: <AccountPage /> },
      {
        element: <RequireRole roles={MANAGERS} />,
        children: [
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          { path: ROUTES.team, element: <TeamPage /> },
          { path: ROUTES.reports, element: <ReportsPage /> },
        ],
      },
      {
        element: <RequireRole roles={['ROLE_ADMIN']} />,
        children: [{ path: ROUTES.adminUsers, element: <AdminUsersPage /> }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function Root() {
  useRestoreSession();
  return (
    <Suspense fallback={<Loading />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
