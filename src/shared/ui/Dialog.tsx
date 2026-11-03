import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { IconButton } from './Button';

interface PanelProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The element that opens it. Leave out when the parent controls `open`. */
  trigger?: ReactNode;
}

export interface DialogProps extends PanelProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'md:max-w-sm', md: 'md:max-w-lg', lg: 'md:max-w-3xl' };

function Panel({
  title,
  description,
  children,
  footer,
  open,
  onOpenChange,
  trigger,
  contentClassName,
}: PanelProps & { contentClassName: string }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-[rgb(10_12_16/0.5)]" />
        <RadixDialog.Content
          // With no description, this stops screen readers reading the whole dialog as one.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-50 flex flex-col border border-line bg-surface shadow-pop outline-none',
            contentClassName,
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <RadixDialog.Title className="text-base font-semibold text-ink">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-sm text-ink2">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close" size="sm" className="-mt-1 -mr-2 shrink-0">
                <X aria-hidden="true" />
              </IconButton>
            </RadixDialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">
              {footer}
            </footer>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** Centred on desktop. A sheet from the bottom on phones, within thumb reach. */
export function Dialog({ size = 'md', ...props }: DialogProps) {
  return (
    <Panel
      {...props}
      contentClassName={cn(
        'inset-x-0 bottom-0 max-h-[90dvh] animate-pop-in rounded-t-card md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:max-h-[calc(100dvh-4rem)] md:w-[calc(100%-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card',
        SIZES[size],
      )}
    />
  );
}

/** A panel from the right edge, for details that sit beside the page. */
export function Sheet(props: PanelProps) {
  return (
    <Panel
      {...props}
      contentClassName="inset-y-0 right-0 h-dvh w-full animate-slide-in md:max-w-md md:rounded-l-card"
    />
  );
}
