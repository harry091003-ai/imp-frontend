import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { Toast as RadixToast } from 'radix-ui';
import { createContext, use, useCallback, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { IconButton } from './Button';
import { TraceReference } from './TraceReference';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: 'success' | 'error';
  /** The backend's trace id, shown so users can quote it to support. */
  traceId?: string | null;
}

interface ActiveToast extends ToastInput {
  id: number;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast(): (toast: ToastInput) => void {
  const show = use(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider');
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((toast: ToastInput) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  return (
    <ToastContext value={show}>
      <RadixToast.Provider swipeDirection="right" label="Notification">
        {children}
        {toasts.map(({ id, title, description, tone = 'success', traceId }) => {
          const isError = tone === 'error';
          const Icon = isError ? CircleAlert : CircleCheck;
          return (
            <RadixToast.Root
              key={id}
              // Errors stay longer: people need time to read them and copy the reference.
              duration={isError ? 10_000 : 4_000}
              type={isError ? 'foreground' : 'background'}
              onOpenChange={(open) => {
                if (!open) setToasts((current) => current.filter((toast) => toast.id !== id));
              }}
              className="flex animate-pop-in items-start gap-3 rounded-input border border-line bg-surface p-3 shadow-pop"
            >
              <Icon
                aria-hidden="true"
                className={cn('mt-0.5 size-4 shrink-0', isError ? 'text-crit' : 'text-s-res')}
              />
              <div className="min-w-0 flex-1">
                <RadixToast.Title className="text-sm font-medium text-ink">
                  {title}
                </RadixToast.Title>
                {description && (
                  <RadixToast.Description className="mt-0.5 text-label text-ink2">
                    {description}
                  </RadixToast.Description>
                )}
                {traceId && <TraceReference traceId={traceId} className="mt-1" />}
              </div>
              <RadixToast.Close asChild>
                <IconButton label="Dismiss" size="sm" className="-my-1 -mr-1 shrink-0">
                  <X aria-hidden="true" />
                </IconButton>
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport className="fixed right-0 bottom-0 z-60 flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </RadixToast.Provider>
    </ToastContext>
  );
}
