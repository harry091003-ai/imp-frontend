import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import {
  ENVIRONMENT_LABELS,
  LEVEL_LABELS,
  PRIORITIES,
  SEVERITIES,
  type Environment,
  type Priority,
  type Severity,
} from '@/shared/lib/constants/domain';
import { Field, Input, SegmentedControl, Select, SeverityBadge, toOptions } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { CreateIncidentInput } from '../types';

const IMPACT: Record<Severity, string> = {
  LOW: 'A small issue. Work continues normally.',
  MEDIUM: 'Some people are affected. There is a way around it.',
  HIGH: 'Many people are affected. Important work is slowed.',
  CRITICAL: 'A key service is down or data is at risk.',
};

type FormControl = Control<CreateIncidentInput>;

export function SeverityField({ control }: { control: FormControl }) {
  return (
    <Controller
      control={control}
      name="severity"
      render={({ field }) => (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label font-medium text-ink">Severity</legend>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {SEVERITIES.map((severity) => (
              <label
                key={severity}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-input border p-3 has-focus-visible:outline-2 has-focus-visible:outline-acc',
                  field.value === severity ? 'border-acc bg-accbg' : 'border-line hover:bg-sunken',
                )}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={field.name}
                  value={severity}
                  checked={field.value === severity}
                  onChange={() => {
                    field.onChange(severity);
                  }}
                />
                <SeverityBadge severity={severity} className="self-start" />
                <span className="text-xs text-ink2">{IMPACT[severity]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    />
  );
}

export function PriorityField({ control }: { control: FormControl }) {
  return (
    <Controller
      control={control}
      name="priority"
      render={({ field }) => (
        <div className="flex flex-col gap-2">
          <span className="text-label font-medium text-ink">Priority</span>
          <SegmentedControl<Priority>
            label="Priority"
            className="self-start"
            value={field.value}
            onValueChange={field.onChange}
            options={PRIORITIES.map((priority) => ({
              value: priority,
              label: LEVEL_LABELS[priority],
            }))}
          />
          <p className="text-xs text-ink3">
            Priority sets the SLA deadlines. Severity describes the impact.
          </p>
        </div>
      )}
    />
  );
}

export function EnvironmentField({ control }: { control: FormControl }) {
  return (
    <Controller
      control={control}
      name="environment"
      render={({ field, fieldState }) => (
        <Field label="Environment" required error={fieldState.error?.message}>
          {(aria) => (
            <Select<Environment>
              {...aria}
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions<Environment>(ENVIRONMENT_LABELS)}
            />
          )}
        </Field>
      )}
    />
  );
}

export function PlaceFields({
  register,
  errors,
}: {
  register: UseFormRegister<CreateIncidentInput>;
  errors: FieldErrors<CreateIncidentInput>;
}) {
  return (
    <>
      <Field
        label="Location"
        hint="Optional. Region, cluster or site."
        error={errors.location?.message}
      >
        {(control) => <Input {...control} {...register('location')} maxLength={255} />}
      </Field>
      <Field
        label="Affected source"
        hint="Optional. Host, pod, job or component."
        error={errors.affectedSource?.message}
      >
        {(control) => <Input {...control} {...register('affectedSource')} maxLength={255} />}
      </Field>
    </>
  );
}
