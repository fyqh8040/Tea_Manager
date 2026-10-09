import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showCloseButton = true
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-[#fdfdfc] rounded-2xl w-full ${maxWidths[maxWidth]} shadow-2xl border border-tea-100 overflow-hidden flex flex-col max-h-[90vh] min-h-0 animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-4 border-b border-tea-100 flex justify-between items-center bg-white/80 shrink-0">
            <div className="text-lg font-bold text-tea-900 font-serif">{title}</div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-tea-400 hover:text-tea-700 p-1 rounded-lg hover:bg-tea-50 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};
