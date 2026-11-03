import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { Slot } from 'radix-ui';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 max-md:h-11 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-btn text-btnink shadow-card hover:opacity-90',
        secondary: 'border-line2 bg-surface text-ink shadow-card hover:bg-sunken',
        ghost: 'border-transparent bg-transparent text-ink2 hover:bg-sunken hover:text-ink',
        // The canvas used --critdot with white text, which fails AA contrast.
        danger: 'border-transparent bg-crit text-surface shadow-card hover:opacity-90',
      },
      size: {
        md: 'h-9 rounded-btn px-3.5 text-sm',
        sm: 'h-7.5 rounded-lg px-2.5 text-label',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonStyles> {
  /** Shows a spinner and blocks clicks, so a slow request cannot be sent twice. */
  loading?: boolean;
  /** Styles the single child instead, such as a router link. */
  asChild?: boolean;
}

export function Button({
  variant,
  size,
  loading = false,
  asChild = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = cn(buttonStyles({ variant, size }), className);

  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, 'aria-label' | 'asChild' | 'loading'> {
  /** Read by screen readers, because the button shows only an icon. */
  label: string;
}

export function IconButton({ label, className, variant = 'ghost', ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant={variant}
      className={cn('w-9 px-0 max-md:w-11', className)}
      {...props}
    />
  );
}
