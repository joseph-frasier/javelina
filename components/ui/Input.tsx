import React from 'react';
import { clsx } from 'clsx';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-orange-dark mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={clsx(
            'w-full px-4 py-2.5 rounded-md border transition-colors',
            'font-regular text-orange-dark dark:text-gray-100',
            'placeholder:text-orange-dark dark:placeholder:text-gray-100',
            'bg-white dark:bg-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-light dark:border-gray-600 focus:ring-orange hover:border-orange/50',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-light',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm font-regular text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm font-light text-gray-slate">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
