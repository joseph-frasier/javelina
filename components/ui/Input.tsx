import React, { useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  suffixHint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, suffixHint, type = 'text', value, ...props }, ref) => {
    const measureRef = useRef<HTMLSpanElement>(null);
    const [suffixOffset, setSuffixOffset] = useState(0);

    // Calculate the width of the input value to position the suffix hint
    useEffect(() => {
      if (measureRef.current && suffixHint && value) {
        const width = measureRef.current.offsetWidth;
        setSuffixOffset(width);
      }
    }, [value, suffixHint]);

    // Determine if we should show the suffix hint
    const valueStr = String(value || '');
    const showSuffixHint = suffixHint && valueStr.length > 0 && !valueStr.endsWith('.');

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
        <div className="relative">
          <input
            ref={ref}
            type={type}
            value={value}
            className={clsx(
              'w-full px-4 py-2.5 rounded-md border transition-colors',
              'font-regular text-orange-dark dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
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
          {/* Hidden span to measure text width */}
          {suffixHint && (
            <span
              ref={measureRef}
              className="absolute opacity-0 pointer-events-none whitespace-pre px-4 py-2.5 font-regular"
              style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
              aria-hidden="true"
            >
              {valueStr}
            </span>
          )}
          {/* Suffix hint overlay */}
          {showSuffixHint && (
            <span
              className="absolute top-0 bottom-0 flex items-center pointer-events-none text-gray-400 dark:text-gray-600 font-regular"
              style={{ left: `${suffixOffset + 16}px` }}
              aria-hidden="true"
            >
              {suffixHint}
            </span>
          )}
        </div>
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
