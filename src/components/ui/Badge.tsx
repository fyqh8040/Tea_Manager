import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  color?: 'tea' | 'accent' | 'clay' | 'red' | 'green' | 'dark' | 'amber';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'tea',
  className = '',
  size = 'md'
}) => {
  const colors = {
    tea: 'bg-tea-100 text-tea-700 border border-tea-200/60',
    accent: 'bg-accent text-white shadow-sm shadow-accent/30',
    clay: 'bg-[#a67b5b] text-white shadow-sm shadow-[#a67b5b]/30',
    red: 'bg-red-50 text-red-600 border border-red-200/70',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    dark: 'bg-black/60 text-white backdrop-blur-md',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200/70'
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded ${sizes[size]} ${colors[color]} ${className}`}
    >
      {children}
    </span>
  );
};
