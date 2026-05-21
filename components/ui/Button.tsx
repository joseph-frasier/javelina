import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-medium tracking-tight',
    'transition-[background-color,color,box-shadow,transform] duration-150',
    'focus-visible:outline-none focus-visible:shadow-focus-ring',
    'disabled:opacity-50 disabled:pointer-events-none',
    'active:translate-y-[0.5px]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-white shadow-card hover:bg-accent-hover',
        secondary:
          'bg-transparent text-accent border border-accent hover:bg-accent-soft',
        ghost:
          'bg-transparent text-text hover:bg-surface-hover',
        outline:
          'bg-transparent text-accent border border-accent hover:bg-accent-soft',
        link:
          'bg-transparent text-accent hover:underline underline-offset-2 px-0 py-0 h-auto shadow-none',
        danger:
          'bg-danger text-white shadow-card hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-[15px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
