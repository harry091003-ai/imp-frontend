import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { broadcastSignOut, endSession, mightHaveSession } from '@/shared/lib/session';
import { changePassword, restoreSession, signIn, signOut, signUp, updateCredentials } from '../api';

/** On page load: the token lived in memory and is gone, so ask for a new one with the cookie. */
export function useRestoreSession(): void {
  useEffect(() => {
    if (!mightHaveSession()) {
      endSession();
      return;
    }
    restoreSession().catch(() => {
      endSession();
    });
  }, []);
}

export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}

export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // The next person on this browser must see nothing left over.
      client.clear();
      broadcastSignOut();
      endSession();
    },
  });
}

/** The backend ends every session after these two changes, so the user signs in again. */
function useEndsSession<T>(mutationFn: (input: T) => Promise<void>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      client.clear();
      broadcastSignOut();
      endSession('CREDENTIALS_CHANGED');
    },
  });
}

export function useChangePassword() {
  return useEndsSession(changePassword);
}

export function useUpdateCredentials() {
  return useEndsSession(updateCredentials);
}
