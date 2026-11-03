import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';

// 16px text on phones: iOS Safari zooms the whole page when a smaller field gets focus.
export const fieldStyles =
  'w-full rounded-input border border-line2 bg-surface text-sm text-ink outline-none transition-shadow placeholder:text-ink3 focus:border-acc focus:shadow-[0_0_0_3px_var(--accbg)] aria-invalid:border-critdot disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink3 max-md:text-base';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldStyles, 'h-10 px-3 max-md:h-11', className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea rows={rows} className={cn(fieldStyles, 'resize-y px-3 py-2', className)} {...props} />
  );
}

export function SearchInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink3"
      />
      <Input type="search" className="pl-9" {...props} />
    </div>
  );
}
