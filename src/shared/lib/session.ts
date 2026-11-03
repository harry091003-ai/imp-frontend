import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import type { Role } from './constants/domain';

export interface SessionUser {
  id: string;
  email: string;
  roles: Role[];
  /** The highest role, which decides the home page and menu. */
  role: Role;
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous'; endedBecause?: string | undefined }
  | { status: 'authenticated'; user: SessionUser };

const claimsSchema = z.object({
  sub: z.string(),
  email: z.string().default(''),
  roles: z.array(z.string()).default([]),
});

const ROLE_ORDER: Role[] = ['ROLE_ADMIN', 'ROLE_SUPERVISOR', 'ROLE_ENGINEER'];

/**
 * Reads who the user is from the token, for showing the right screens only. Real security stays on
 * the backend, which checks the signature. The profile can lag after signup, but the token cannot.
 */
export function userFromToken(token: string): SessionUser | null {
  try {
    const payload = token.split('.')[1] ?? '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = claimsSchema.parse(JSON.parse(json));
    const roles = ROLE_ORDER.filter((role) => claims.roles.includes(role));
    const role = roles[0];
    return role ? { id: claims.sub, email: claims.email, roles, role } : null;
  } catch {
    return null;
  }
}

const HAS_SESSION_KEY = 'imp-has-session';
const channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel('imp-session') : null;

let state: SessionState = { status: 'loading' };
const listeners = new Set<() => void>();

function publish(next: SessionState): void {
  state = next;
  listeners.forEach((listener) => {
    listener();
  });
}

function rememberSession(active: boolean): void {
  try {
    // Holds no secret. It only saves a refresh call for visitors who are not signed in.
    if (active) localStorage.setItem(HAS_SESSION_KEY, '1');
    else localStorage.removeItem(HAS_SESSION_KEY);
  } catch {
    // Storage can be blocked. Signing in still works; it just will not survive a reload.
  }
}

export function mightHaveSession(): boolean {
  try {
    return localStorage.getItem(HAS_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Called with every new access token, from login and from refresh. */
export function applyAccessToken(token: string): void {
  const user = userFromToken(token);
  if (!user) {
    endSession('INVALID_RESPONSE');
    return;
  }
  // The cookie is shared, so a sign-in as someone else in another tab would change who this tab
  // is. Reloading drops everything that belonged to the previous person.
  if (state.status === 'authenticated' && state.user.id !== user.id) {
    location.reload();
    return;
  }
  rememberSession(true);
  publish({ status: 'authenticated', user });
}

export function endSession(reason?: string): void {
  rememberSession(false);
  publish({ status: 'anonymous', endedBecause: reason });
}

/** Signing out here signs out every other tab too. */
export function broadcastSignOut(): void {
  channel?.postMessage('signed-out');
}

channel?.addEventListener('message', () => {
  endSession();
});

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state);
}

/** For pages behind the sign-in guard, where a user always exists. */
export function useCurrentUser(): SessionUser {
  const session = useSession();
  if (session.status !== 'authenticated') throw new Error('No signed-in user');
  return session.user;
}
