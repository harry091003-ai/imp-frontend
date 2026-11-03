import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { applyServerFieldErrors } from '@/shared/lib/forms';
import { toApiError } from '@/shared/lib/http/errors';
import { useCurrentUser } from '@/shared/lib/session';
import {
  Button,
  Card,
  Field,
  InlineAlert,
  Input,
  PageHeader,
  RoleBadge,
  ThemeToggle,
} from '@/shared/ui';
import { useChangePassword, useUpdateCredentials } from '../hooks';
import {
  changePasswordSchema,
  updateCredentialsSchema,
  type ChangePasswordInput,
  type UpdateCredentialsInput,
} from '../types';

function PasswordForm() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldpassword: '', newpassword: '' },
  });
  const failure = change.error ? toApiError(change.error) : null;

  const onSubmit = handleSubmit((values) => {
    change.mutate(values, {
      onError: (error) => {
        applyServerFieldErrors(
          toApiError(error).fieldErrors,
          ['oldpassword', 'newpassword'],
          setError,
        );
      },
    });
  });

  return (
    <form noValidate className="flex flex-col gap-4 p-5" onSubmit={(event) => void onSubmit(event)}>
      <h2 className="text-base font-semibold text-ink">Change password</h2>
      {failure && <InlineAlert tone="error">{failure.message}</InlineAlert>}
      <Field label="Current password" error={errors.oldpassword?.message}>
        {(control) => (
          <Input
            {...control}
            {...register('oldpassword')}
            type="password"
            autoComplete="current-password"
          />
        )}
      </Field>
      <Field label="New password" hint="6 to 72 characters." error={errors.newpassword?.message}>
        {(control) => (
          <Input
            {...control}
            {...register('newpassword')}
            type="password"
            autoComplete="new-password"
          />
        )}
      </Field>
      <div>
        <Button type="submit" variant="primary" loading={change.isPending}>
          Change password
        </Button>
      </div>
    </form>
  );
}

function DetailsForm({ email }: { email: string }) {
  const update = useUpdateCredentials();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateCredentialsInput>({
    resolver: zodResolver(updateCredentialsSchema),
    defaultValues: { newEmail: '', newUsername: '', password: '' },
  });
  const failure = update.error ? toApiError(update.error) : null;

  const onSubmit = handleSubmit((values) => {
    update.mutate(values, {
      onError: (error) => {
        applyServerFieldErrors(
          toApiError(error).fieldErrors,
          ['newEmail', 'newUsername', 'password'],
          setError,
        );
      },
    });
  });

  return (
    <form noValidate className="flex flex-col gap-4 p-5" onSubmit={(event) => void onSubmit(event)}>
      <h2 className="text-base font-semibold text-ink">Change email or username</h2>
      {failure && <InlineAlert tone="error">{failure.message}</InlineAlert>}
      <Field label="New email" hint={`Now: ${email}`} error={errors.newEmail?.message}>
        {(control) => <Input {...control} {...register('newEmail')} type="email" />}
      </Field>
      <Field label="New username" error={errors.newUsername?.message}>
        {(control) => <Input {...control} {...register('newUsername')} />}
      </Field>
      <Field label="Current password" required error={errors.password?.message}>
        {(control) => (
          <Input
            {...control}
            {...register('password')}
            type="password"
            autoComplete="current-password"
          />
        )}
      </Field>
      <div>
        <Button type="submit" variant="primary" loading={update.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export default function AccountPage() {
  const user = useCurrentUser();
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title="Account"
        description="Changing your password or details signs you out on every device."
      />
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-ink">{user.email}</p>
          <div className="flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </div>
        </div>
        <ThemeToggle />
      </Card>
      <Card>
        <PasswordForm />
      </Card>
      <Card>
        <DetailsForm email={user.email} />
      </Card>
    </div>
  );
}
