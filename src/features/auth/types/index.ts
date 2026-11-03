import { z } from 'zod';

const email = z.email('Enter a valid email').max(100, 'Email is too long');

/** LoginFromDTO. `username` is added by the API call: the backend requires it and never reads it. */
export const signInSchema = z.object({
  email,
  password: z.string().min(6, 'At least 6 characters').max(72, 'At most 72 characters'),
});
export type SignInInput = z.infer<typeof signInSchema>;

/** SignupFormDTO. */
export const signUpSchema = signInSchema.extend({
  username: z.string().trim().min(1, 'Choose a username').max(25, 'At most 25 characters'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * LoginResponseDTO. The token key is unconfirmed: the Java field is JWTtoken, but Jackson should
 * send jwttoken. This accepts either until a real login settles it (REMAINING-WORK.md).
 */
export const loginResponseSchema = z
  .object({
    jwttoken: z.string().min(1).optional(),
    JWTtoken: z.string().min(1).optional(),
  })
  .transform((body) => body.jwttoken ?? body.JWTtoken)
  .pipe(z.string());

/** ChangePasswordDTO. */
export const changePasswordSchema = z.object({
  oldpassword: z.string().min(1, 'Enter your current password').max(72, 'At most 72 characters'),
  newpassword: z.string().min(6, 'At least 6 characters').max(72, 'At most 72 characters'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** UpdateCredentialsRequestDTO. */
export const updateCredentialsSchema = z.object({
  newEmail: z.union([email, z.literal('')]),
  newUsername: z.string().trim().max(25, 'At most 25 characters'),
  password: z.string().min(1, 'Enter your current password').max(72, 'At most 72 characters'),
});
export type UpdateCredentialsInput = z.infer<typeof updateCredentialsSchema>;
