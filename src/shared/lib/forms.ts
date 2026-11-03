import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

interface ServerFieldError {
  field: string;
  message: string;
}

/**
 * Shows backend validation errors on their own form fields. Returns the ones with no field on this
 * form, so the caller can show them above the form and none is lost.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  errors: ServerFieldError[],
  fields: readonly FieldPath<T>[],
  setError: UseFormSetError<T>,
): ServerFieldError[] {
  const unmatched: ServerFieldError[] = [];
  let focused = false;
  for (const error of errors) {
    const field = fields.find((name) => name === error.field);
    if (field) {
      setError(field, { type: 'server', message: error.message }, { shouldFocus: !focused });
      focused = true;
    } else {
      unmatched.push(error);
    }
  }
  return unmatched;
}
