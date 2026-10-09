import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  rightLabel?: React.ReactNode;
  prefixIcon?: React.ReactNode;
  required?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  rightLabel,
  prefixIcon,
  required
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) => !value || opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="space-y-1.5 w-full relative" ref={wrapperRef}>
      {(label || rightLabel) && (
        <div className="flex justify-between items-baseline">
          {label && (
            <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block">
              {label}
            </label>
          )}
          {rightLabel}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          className={`w-full px-3 py-2 bg-white/70 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-tea-800 placeholder-tea-300 text-sm ${
            prefixIcon ? 'pl-9' : ''
          } pr-8`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tea-400 hover:text-accent p-0.5"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-tea-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {filteredOptions.length > 0 ? (
              <div className="p-1 grid grid-cols-2 gap-1">
                {filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="text-left px-3 py-1.5 text-xs text-tea-700 hover:bg-tea-50 hover:text-accent rounded-md transition-colors truncate"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 text-xs text-tea-400 text-center">
                可直接保留输入 "{value}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
