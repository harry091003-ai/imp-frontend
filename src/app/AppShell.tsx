import {
  Bell,
  ChartColumn,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Plus,
  ShieldCheck,
  Siren,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useSignOut } from '@/features/auth';
import { useNewAlertCount } from '@/features/notifications';
import { cn } from '@/shared/lib/cn';
import { ROLE_LABELS, type Role } from '@/shared/lib/constants/domain';
import { ROUTES } from '@/shared/lib/constants/routes';
import { env } from '@/shared/lib/env';
import { toApiError } from '@/shared/lib/http/errors';
import { useCurrentUser } from '@/shared/lib/session';
import {
  Avatar,
  Button,
  IconButton,
  Logo,
  OfflineBanner,
  Skeleton,
  ThemeToggle,
  useToast,
} from '@/shared/ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: readonly Role[];
}

const MANAGERS: readonly Role[] = ['ROLE_ADMIN', 'ROLE_SUPERVISOR'];
const EVERYONE: readonly Role[] = ['ROLE_ADMIN', 'ROLE_SUPERVISOR', 'ROLE_ENGINEER'];

const NAV: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, roles: MANAGERS },
  { to: ROUTES.myWork, label: 'My work', icon: ListChecks, roles: ['ROLE_ENGINEER'] },
  { to: ROUTES.incidents, label: 'Incidents', icon: Siren, roles: EVERYONE },
  { to: ROUTES.team, label: 'Team', icon: Users, roles: MANAGERS },
  { to: ROUTES.reports, label: 'Reports', icon: ChartColumn, roles: MANAGERS },
  { to: ROUTES.alerts, label: 'Alerts', icon: Bell, roles: EVERYONE },
  { to: ROUTES.adminUsers, label: 'Users and roles', icon: ShieldCheck, roles: ['ROLE_ADMIN'] },
];

function useNavItems(): NavItem[] {
  const { role } = useCurrentUser();
  return NAV.filter((item) => item.roles.includes(role));
}

function Sidebar() {
  const user = useCurrentUser();
  const items = useNavItems();
  const newAlerts = useNewAlertCount();
  const signOut = useSignOut();
  const toast = useToast();

  return (
    <aside className="sticky top-0 flex h-dvh w-62 shrink-0 flex-col gap-1 border-r border-line bg-surface px-3 pt-4.5 pb-4 max-lg:hidden">
      <Link to="/" className="flex items-center gap-2.5 px-2 pb-4.5">
        <Logo />
        <span className="flex flex-col leading-tight">
          <b className="text-[15px] tracking-tight text-ink">IMP</b>
          <span className="text-xs text-ink3">Incident platform</span>
        </span>
      </Link>
      <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-ink3 uppercase">
        Workspace
      </p>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex h-9.5 items-center gap-2.5 rounded-btn px-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-accbg text-acc' : 'text-ink2 hover:bg-sunken hover:text-ink',
              )
            }
          >
            <Icon aria-hidden="true" className="size-4.5" />
            {label}
            {to === ROUTES.alerts && newAlerts > 0 && (
              <span className="ml-auto flex h-5 min-w-5.5 items-center justify-center rounded-full bg-critbg px-1.5 text-[11px] font-semibold text-crit">
                {newAlerts}
                <span className="sr-only"> new</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-2.5 rounded-xl border border-line p-2.5">
        <Avatar name={user.email} />
        <Link to={ROUTES.account} className="flex min-w-0 flex-col leading-tight hover:underline">
          <b className="truncate text-label font-semibold text-ink">{user.email}</b>
          <span className="text-xs text-ink3">{ROLE_LABELS[user.role]}</span>
        </Link>
        <IconButton
          label="Sign out"
          size="sm"
          className="ml-auto shrink-0"
          disabled={signOut.isPending}
          onClick={() => {
            signOut.mutate(undefined, {
              onError: (error) => {
                const failure = toApiError(error);
                toast({
                  title: 'Could not sign out',
                  description: 'You are still signed in. Please try again.',
                  tone: 'error',
                  traceId: failure.traceId,
                });
              },
            });
          }}
        >
          <LogOut aria-hidden="true" />
        </IconButton>
      </div>
    </aside>
  );
}

function TopBar() {
  const newAlerts = useNewAlertCount();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5 md:px-8">
      <Link to="/" aria-label="Home" className="lg:hidden">
        <Logo />
      </Link>
      <div className="flex-1" />
      <ThemeToggle className="max-sm:hidden" />
      <Button
        asChild
        className="relative w-9.5 px-0 max-md:w-11"
        aria-label={newAlerts > 0 ? `Alerts, ${String(newAlerts)} new` : 'Alerts'}
      >
        <Link to={ROUTES.alerts}>
          <Bell aria-hidden="true" />
          {newAlerts > 0 && (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-critdot ring-2 ring-surface" />
          )}
        </Link>
      </Button>
      <Button asChild variant="primary">
        <Link to={ROUTES.newIncident}>
          <Plus aria-hidden="true" />
          New incident
        </Link>
      </Button>
    </header>
  );
}

function MobileNav() {
  const items = useNavItems();
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium',
              isActive ? 'text-acc' : 'text-ink3',
            )
          }
        >
          <Icon aria-hidden="true" className="size-5" />
          <span className="max-w-full truncate">{label}</span>
        </NavLink>
      ))}
      <NavLink
        to={ROUTES.account}
        className={({ isActive }) =>
          cn(
            'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
            isActive ? 'text-acc' : 'text-ink3',
          )
        }
      >
        <Avatar name="Account" className="size-5 text-[8px]" />
        Account
      </NavLink>
    </nav>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-64 w-full rounded-card" />
    </div>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {import.meta.env.DEV && env.apiMocking && (
          <section
            aria-label="Data source"
            className="bg-accbg px-4 py-1 text-center text-xs font-medium text-acc"
          >
            Sample data mode. Nothing here comes from your real backend.
          </section>
        )}
        <TopBar />
        <main className="mx-auto w-full max-w-330 flex-1 px-4 pt-7 pb-14 md:px-8">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
