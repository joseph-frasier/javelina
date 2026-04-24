import React, { useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  suffixHint?: string;
  mono?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, suffixHint, mono, type = 'text', value, ...props },
    ref
  ) => {
    const measureRef = useRef<HTMLSpanElement>(null);
    const [suffixOffset, setSuffixOffset] = useState(0);

    const getSuffixToShow = () => {
      if (!suffixHint || !value) return suffixHint;
      const valueStr = String(value);
      let matchedChars = 0;
      for (let i = 0; i < suffixHint.length; i++) {
        if (valueStr.endsWith(suffixHint.substring(0, i + 1))) {
          matchedChars = i + 1;
        }
      }
      return suffixHint.substring(matchedChars);
    };

    useEffect(() => {
      if (measureRef.current && suffixHint && value) {
        const width = measureRef.current.scrollWidth;
        setSuffixOffset(width);
      }
    }, [value, suffixHint]);

    const valueStr = String(value || '');
    const suffixToShow = getSuffixToShow();
    const showSuffixHint =
      suffixHint &&
      valueStr.length > 0 &&
      !valueStr.endsWith('.') &&
      suffixToShow &&
      suffixToShow.length > 0;

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
        <div className="relative">
          <input
            ref={ref}
            type={type}
            value={value}
            className={clsx(
              'w-full h-10 px-3 rounded-md border bg-surface text-text',
              mono ? 'font-mono text-[13px]' : 'font-sans text-sm',
              'placeholder:text-text-faint',
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
          {suffixHint && (
            <span
              ref={measureRef}
              className={clsx(
                'absolute opacity-0 pointer-events-none whitespace-pre',
                mono ? 'font-mono' : 'font-sans'
              )}
              style={{ fontSize: 'inherit', fontFamily: 'inherit', left: '12px' }}
              aria-hidden="true"
            >
              {valueStr}
            </span>
          )}
          {showSuffixHint && (
            <span
              className={clsx(
                'absolute top-0 bottom-0 flex items-center pointer-events-none text-text-faint',
                mono ? 'font-mono' : 'font-sans'
              )}
              style={{ left: `${suffixOffset + 12}px` }}
              aria-hidden="true"
            >
              {suffixToShow}
            </span>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
