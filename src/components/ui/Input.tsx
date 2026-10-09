import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rightLabel?: React.ReactNode;
  prefixIcon?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  rightLabel,
  prefixIcon,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="space-y-1.5 w-full">
      {(label || rightLabel) && (
        <div className="flex justify-between items-baseline">
          {label && (
            <label
              htmlFor={inputId}
              className="text-xs font-semibold text-tea-600 uppercase tracking-wider block"
            >
              {label}
            </label>
          )}
          {rightLabel}
        </div>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={`w-full px-3 py-2 bg-white/70 border ${
            error ? 'border-red-300 ring-1 ring-red-300' : 'border-tea-200'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-tea-800 placeholder-tea-300 disabled:opacity-50 disabled:bg-tea-100/50 text-sm ${
            prefixIcon ? 'pl-9' : ''
          } ${className}`}
          {...props}
        />
        {prefixIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-tea-400 pointer-events-none flex items-center justify-center">
            {prefixIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
