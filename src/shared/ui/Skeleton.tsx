import { cn } from '../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('h-3 animate-pulse rounded-md bg-line', className)} />
  );
}
