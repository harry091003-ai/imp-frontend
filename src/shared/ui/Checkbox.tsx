import { Check } from 'lucide-react';
import { Checkbox as RadixCheckbox } from 'radix-ui';
import type { ReactNode } from 'react';

export interface CheckboxProps {
  label: ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
}

export function Checkbox({ label, checked, onCheckedChange, disabled, name }: CheckboxProps) {
  return (
    <label className="inline-flex min-h-6 cursor-pointer items-center gap-2 text-sm text-ink has-disabled:cursor-not-allowed has-disabled:opacity-50 max-md:min-h-11">
      <RadixCheckbox.Root
        checked={checked}
        onCheckedChange={(next) => onCheckedChange?.(next === true)}
        disabled={disabled}
        name={name}
        className="flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border border-line2 bg-surface data-[state=checked]:border-transparent data-[state=checked]:bg-btn data-[state=checked]:text-btnink"
      >
        <RadixCheckbox.Indicator>
          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label}
    </label>
  );
}
