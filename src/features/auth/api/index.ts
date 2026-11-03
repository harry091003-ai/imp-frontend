import { ENDPOINTS } from '@/shared/lib/api/endpoints';
import { parseResponse } from '@/shared/lib/api/schemas';
import { http } from '@/shared/lib/http';
import {
  loginResponseSchema,
  type ChangePasswordInput,
  type SignInInput,
  type SignUpInput,
  type UpdateCredentialsInput,
} from '../types';

export async function signIn(input: SignInInput): Promise<void> {
  const { data } = await http.api.post<unknown>(ENDPOINTS.auth.login, {
    ...input,
    // Required by LoginFromDTO and never read (BCR-14). Sending the email keeps it harmless.
    username: input.email,
  });
  http.setAccessToken(parseResponse(loginResponseSchema, data));
}

export async function signUp(input: SignUpInput): Promise<void> {
  await http.api.post(ENDPOINTS.auth.signup, input);
}

export async function signOut(): Promise<void> {
  await http.api.post(ENDPOINTS.auth.logout);
  http.setAccessToken(null);
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await http.api.post(ENDPOINTS.auth.changePassword, input);
}

export async function updateCredentials(input: UpdateCredentialsInput): Promise<void> {
  await http.api.put(ENDPOINTS.auth.updateCredentials, {
    password: input.password,
    newEmail: input.newEmail || undefined,
    newUsername: input.newUsername || undefined,
  });
}

export function restoreSession(): Promise<void> {
  return http.refreshSession();
}
