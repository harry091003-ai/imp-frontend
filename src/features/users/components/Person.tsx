import { cn } from '@/shared/lib/cn';
import { useSession } from '@/shared/lib/session';
import { Avatar } from '@/shared/ui';
import type { UserNames } from '../hooks';

export interface PersonProps {
  id: string | null | undefined;
  names: UserNames;
  emptyLabel?: string;
  className?: string;
}

/** A person by id. Shows a short id if the name is unknown, and never makes one up. */
export function Person({ id, names, emptyLabel = 'Unassigned', className }: PersonProps) {
  const session = useSession();
  if (!id) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-label text-ink3', className)}>
        <Avatar />
        {emptyLabel}
      </span>
    );
  }
  const isMe = session.status === 'authenticated' && session.user.id === id;
  const label = names.get(id) ?? id.slice(0, 8);
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 text-label text-ink', className)}>
      <Avatar name={label} />
      <span className="truncate">
        {label}
        {isMe && <span className="text-ink3"> (you)</span>}
      </span>
    </span>
  );
}
