import { Tabs as RadixTabs, ToggleGroup } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        '-mb-px flex h-10 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-ink2 hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink max-md:h-11 max-md:min-w-11 max-md:justify-center',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn('pt-4 outline-none', className)} {...props} />;
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Needed when `label` shows only an icon. */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      // Radix sends an empty value when the active item is pressed. One must stay selected.
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      className={cn(
        'inline-flex max-w-full gap-0.5 overflow-x-auto rounded-input border border-line bg-sunken p-0.75',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          className="inline-flex h-7 items-center gap-1.5 rounded-[7px] px-3 text-label font-medium whitespace-nowrap text-ink2 hover:text-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-card max-md:h-11 max-md:min-w-11 max-md:justify-center [&_svg]:size-4"
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
