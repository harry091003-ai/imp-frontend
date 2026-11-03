import { zodResolver } from '@hookform/resolvers/zod';
import { CircleUserRound, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router';
import { ERROR_CODES } from '@/shared/lib/constants/errorCodes';
import { env } from '@/shared/lib/env';
import { applyServerFieldErrors } from '@/shared/lib/forms';
import { toApiError } from '@/shared/lib/http/errors';
import { useSession } from '@/shared/lib/session';
import { Button, Field, InlineAlert, Input, Logo, TraceReference } from '@/shared/ui';
import { useSignIn, useSignUp } from '../hooks';
import { signInSchema, signUpSchema, type SignUpInput } from '../types';

const END_MESSAGES: Record<string, string> = {
  [ERROR_CODES.TOKEN_REVOKED]: 'You were signed out. Please sign in again.',
  [ERROR_CODES.REFRESH_TOKEN_REUSED]: 'For your safety you were signed out. Please sign in again.',
  [ERROR_CODES.REFRESH_TOKEN_EXPIRED]: 'Your session ended after 7 days. Please sign in again.',
  [ERROR_CODES.ACCOUNT_LOCKED]: 'Your account is locked for 15 minutes after 5 wrong passwords.',
  CREDENTIALS_CHANGED: 'Your details were changed. Please sign in again.',
};

function ProductStory() {
  return (
    <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0b1020] px-6 py-10 text-[#e9edf7] lg:px-16 lg:py-11">
      <div className="absolute -top-60 -right-60 size-160 rounded-full border border-[rgb(255_255_255/0.07)]" />
      <div className="absolute -top-32 -right-32 size-105 rounded-full border border-[rgb(255_255_255/0.07)]" />
      <div className="relative flex items-center gap-3">
        <Logo inverted />
        <span className="flex flex-col leading-tight">
          <b className="text-base tracking-tight">IMP</b>
          <span className="text-xs text-[#97a3c0]">Incident platform</span>
        </span>
      </div>
      <div className="relative mt-12 max-w-xl lg:mt-24">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight lg:text-[46px]">
          Resolve incidents faster. Every SLA in sight.
        </h1>
        <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-[#aeb8d2]">
          Raise, assign and resolve incidents with live SLA timers and suggestions drawn from your
          own past fixes.
        </p>
      </div>
      {/* A picture of the product, like the design. It is an illustration, not anyone's data. */}
      <div
        aria-hidden="true"
        className="relative mt-12 flex max-w-130 flex-col gap-3.5 max-lg:hidden"
      >
        <div className="flex flex-col gap-3 rounded-2xl border border-[rgb(255_255_255/0.12)] bg-[rgb(255_255_255/0.06)] px-4.5 py-4">
          <b className="text-[15px] font-semibold">Payment API returning 502 on checkout</b>
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="rounded-full bg-[rgb(98_214_224/0.16)] px-2.5 py-1 font-medium text-[#8be6ee]">
              In progress
            </span>
            <span className="ml-auto rounded-[7px] bg-[rgb(255_178_107/0.16)] px-2.5 py-1 font-medium text-[#ffc58f]">
              52 min left to resolve
            </span>
          </div>
        </div>
        <div className="ml-12 flex flex-col gap-1 rounded-2xl border border-[rgb(255_255_255/0.12)] bg-[rgb(255_255_255/0.06)] px-4.5 py-4">
          <b className="text-label font-semibold text-[#c3c8ff]">AI suggestion</b>
          <span className="text-sm leading-normal text-[#dce2f2]">
            Likely cause: database connection pool exhausted after a deploy. Raising the pool limit
            fixed 3 similar incidents.
          </span>
        </div>
      </div>
      <p className="relative mt-auto pt-12 text-label text-[#7f8ba8]">
        Incident Management Platform
      </p>
    </section>
  );
}

function SampleAccounts({ onPick }: { onPick: (email: string) => void }) {
  const accounts = [
    { role: 'Engineer', email: 'ravi.sharma@imp.example' },
    { role: 'Supervisor', email: 'meera.patel@imp.example' },
    { role: 'Admin', email: 'dana.kim@imp.example' },
  ];
  return (
    <div className="flex flex-col gap-2 rounded-input border border-dashed border-line2 p-3">
      <p className="text-label font-medium text-ink">Sample data mode: sign in as</p>
      <div className="flex flex-wrap gap-2">
        {accounts.map((account) => (
          <Button
            key={account.role}
            size="sm"
            onClick={() => {
              onPick(account.email);
            }}
          >
            <CircleUserRound aria-hidden="true" />
            {account.role}
          </Button>
        ))}
      </div>
      <p className="text-xs text-ink3">Password for all: password</p>
    </div>
  );
}

export default function SignInPage() {
  const session = useSession();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [created, setCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signIn = useSignIn();
  const signUp = useSignUp();
  const isUp = mode === 'up';
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<SignUpInput>({
    // Sign-in has no username, so each mode checks only its own fields.
    resolver: zodResolver(isUp ? signUpSchema : signInSchema) as never,
    defaultValues: { username: '', email: '', password: '' },
  });

  if (session.status === 'authenticated') return <Navigate to="/" replace />;

  const pending = signIn.isPending || signUp.isPending;
  const error = isUp ? signUp.error : signIn.error;
  const apiError = error ? toApiError(error) : null;
  const endMessage =
    session.status === 'anonymous' && session.endedBecause
      ? END_MESSAGES[session.endedBecause]
      : undefined;

  const onSubmit = handleSubmit((values) => {
    const onError = (failure: unknown) => {
      applyServerFieldErrors(
        toApiError(failure).fieldErrors,
        ['username', 'email', 'password'],
        setError,
      );
    };
    if (isUp) {
      signUp.mutate(values, {
        onSuccess: () => {
          // Signing up does not sign in. The new account goes through the normal login.
          setCreated(true);
          setMode('in');
        },
        onError,
      });
    } else {
      signIn.mutate({ email: values.email, password: values.password }, { onError });
    }
  });

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      <ProductStory />
      <section className="flex flex-1 items-center justify-center bg-bg px-4 py-10 lg:px-8 lg:py-12">
        <div className="flex w-full max-w-100 flex-col gap-5.5">
          <div>
            <h2 className="text-[28px] font-semibold tracking-tight text-ink">
              {isUp ? 'Create your account' : 'Sign in'}
            </h2>
            <p className="mt-2 text-[15px] text-ink3">
              {isUp
                ? 'Join your team on IMP in under a minute.'
                : 'Welcome back. Enter your details to continue.'}
            </p>
          </div>

          {endMessage && !apiError && <InlineAlert tone="warning">{endMessage}</InlineAlert>}
          {created && !isUp && (
            <InlineAlert tone="success">
              <b>Account created.</b> Sign in to continue.
            </InlineAlert>
          )}
          {apiError && (
            <InlineAlert tone="error">
              {apiError.message}
              {apiError.traceId && (
                <TraceReference traceId={apiError.traceId} className="mt-1 flex" />
              )}
            </InlineAlert>
          )}

          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(event) => void onSubmit(event)}
          >
            {isUp && (
              <Field label="Username" hint="Up to 25 characters." error={errors.username?.message}>
                {(control) => (
                  <Input
                    {...control}
                    {...register('username')}
                    placeholder="meera.patel"
                    autoComplete="username"
                  />
                )}
              </Field>
            )}
            <Field label="Work email" error={errors.email?.message}>
              {(control) => (
                <Input
                  {...control}
                  {...register('email')}
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              )}
            </Field>
            <Field label="Password" error={errors.password?.message}>
              {(control) => (
                <div className="relative">
                  <Input
                    {...control}
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="6 to 72 characters"
                    autoComplete={isUp ? 'new-password' : 'current-password'}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => {
                      setShowPassword((shown) => !shown);
                    }}
                    className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink3 hover:bg-sunken max-md:size-10"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </div>
              )}
            </Field>
            <Button
              type="submit"
              variant="primary"
              loading={pending}
              className="h-11.5 w-full text-[15px]"
            >
              {isUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          {isUp && (
            <InlineAlert tone="info">
              New accounts start as Engineer. An admin can change your role later.
            </InlineAlert>
          )}
          <p className="text-center text-sm text-ink3">
            {isUp ? 'Already have an account? ' : 'New to IMP? '}
            <button
              type="button"
              className="font-medium text-acc hover:underline"
              onClick={() => {
                setMode(isUp ? 'in' : 'up');
                setCreated(false);
                signIn.reset();
                signUp.reset();
              }}
            >
              {isUp ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          {import.meta.env.DEV && env.apiMocking && !isUp && (
            <SampleAccounts
              onPick={(email) => {
                setValue('email', email);
                setValue('password', 'password');
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}
