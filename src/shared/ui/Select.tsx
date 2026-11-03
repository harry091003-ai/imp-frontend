import { Check, ChevronDown } from 'lucide-react';
import { Select as RadixSelect } from 'radix-ui';
import type { Ref } from 'react';
import { cn } from '../lib/cn';
import { fieldStyles } from './Input';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  options: readonly SelectOption<T>[];
  value?: T | undefined;
  onValueChange?: (value: T) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
  'aria-label'?: string;
  'aria-invalid'?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  'aria-required'?: boolean | undefined;
}

/** Turns a value-to-label map from constants/domain.ts into options. */
export function toOptions<T extends string>(labels: Record<T, string>): SelectOption<T>[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export function Select<T extends string = string>({
  options,
  value,
  onValueChange,
  onBlur,
  placeholder = 'Select',
  disabled,
  name,
  className,
  ref,
  ...trigger
}: SelectProps<T>) {
  return (
    <RadixSelect.Root
      // An empty value shows the placeholder, and keeps the control controlled for forms.
      value={value ?? ''}
      onValueChange={(next) => onValueChange?.(next as T)}
      disabled={disabled}
      name={name}
    >
      <RadixSelect.Trigger
        ref={ref}
        onBlur={onBlur}
        className={cn(
          fieldStyles,
          'flex h-10 items-center justify-between gap-2 px-3 text-left data-placeholder:text-ink3 max-md:h-11',
          className,
        )}
        {...trigger}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown aria-hidden="true" className="size-4 text-ink3" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) animate-pop-in overflow-hidden rounded-input border border-line bg-surface shadow-pop"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="flex min-h-9 cursor-pointer items-center justify-between gap-4 rounded-md px-2.5 text-sm text-ink outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-sunken max-md:min-h-11"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check aria-hidden="true" className="size-4 text-acc" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
