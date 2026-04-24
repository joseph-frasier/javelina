import React from 'react';
import { clsx } from 'clsx';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  mono?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, mono, rows = 4, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-text mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={clsx(
            'w-full px-3 py-2.5 rounded-md border bg-surface text-text',
            mono ? 'font-mono text-[13px]' : 'font-sans text-sm',
            'placeholder:text-text-faint resize-y',
            'transition-[border-color,box-shadow] duration-150',
            'focus-visible:outline-none focus-visible:shadow-focus-ring',
            error
              ? 'border-danger focus-visible:border-danger'
              : 'border-border hover:border-border-strong focus-visible:border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-alt',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
