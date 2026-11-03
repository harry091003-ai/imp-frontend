import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
  'aria-required': boolean | undefined;
}

export interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean;
  /** Characters used so far. Shown with maxLength as a counter, matching backend limits. */
  count?: number;
  maxLength?: number;
  className?: string;
  /** Spread these on the control, so label, error and hint are linked for screen readers. */
  children: (control: FieldControlProps) => ReactNode;
}

export function Field({
  label,
  error,
  hint,
  required = false,
  count,
  maxLength,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');
  const showCounter = count !== undefined && maxLength !== undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label font-medium text-ink">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-crit">
              *
            </span>
          )}
        </label>
        {showCounter && (
          <span
            className={cn(
              'text-xs text-ink3 tabular-nums',
              count > maxLength && 'font-medium text-crit',
            )}
          >
            {count}/{maxLength}
          </span>
        )}
      </div>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        'aria-required': required || undefined,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-ink3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-crit">
          {error}
        </p>
      )}
    </div>
  );
}
