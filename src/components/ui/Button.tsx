import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  ...rest
}) => {
  const baseStyle =
    'rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-dark shadow-md shadow-accent/20 active:bg-accent-dark',
    secondary: 'bg-white text-tea-700 border border-tea-200 hover:bg-tea-50 hover:border-tea-300',
    danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:text-red-700',
    ghost: 'text-tea-600 hover:bg-tea-100 hover:text-tea-900',
    outline: 'border border-tea-300 text-tea-700 hover:border-accent hover:text-accent bg-transparent'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
      {children}
    </button>
  );
};
