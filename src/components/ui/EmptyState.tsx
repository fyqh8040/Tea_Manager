import React from 'react';
import { Leaf } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = '暂无藏品',
  description = '茶香静候知音，立即添加第一款珍藏吧。',
  actionLabel,
  onAction
}) => {
  return (
    <div className="col-span-full py-16 px-4 text-center">
      <div className="mx-auto w-16 h-16 bg-tea-100/70 border border-tea-200/50 rounded-2xl flex items-center justify-center mb-4 text-accent shadow-sm">
        {icon || <Leaf size={28} />}
      </div>
      <h3 className="text-base font-bold text-tea-800 font-serif mb-1">{title}</h3>
      <p className="text-xs text-tea-400 max-w-sm mx-auto mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mx-auto">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
