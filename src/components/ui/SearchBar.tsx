import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search Thekua, A2 Desi Cow Milk, Fresh Paneer, Sweets...',
  className = '',
  size = 'md',
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Global hotkey: press '/' or 'Ctrl+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || (e.ctrlKey && e.key === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(value);
    }
  };

  const sizeStyles = {
    sm: 'py-1.5 pl-8 pr-12 text-xs min-h-[36px]',
    md: 'py-2 pl-9 pr-14 text-sm min-h-[44px]',
    lg: 'py-3 pl-11 pr-16 text-base min-h-[50px]',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5 left-2.5',
    md: 'w-4 h-4 left-3',
    lg: 'w-5 h-5 left-3.5',
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`relative flex items-center w-full ${className}`}
    >
      <label htmlFor="puresudh-search-input" className="sr-only">
        Search fresh foods, dairy and sweets
      </label>

      <Search
        className={`absolute text-stone-400 pointer-events-none transition-colors ${
          isFocused ? 'text-emerald-700' : ''
        } ${iconSizes[size] || iconSizes.md}`}
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        id="puresudh-search-input"
        type="search"
        autoFocus={autoFocus}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`w-full bg-white text-stone-900 placeholder:text-stone-400 rounded-2xl border transition-all duration-200 focus:outline-none ${
          isFocused
            ? 'border-emerald-700 ring-2 ring-emerald-100 shadow-sm'
            : 'border-stone-200/90 hover:border-stone-300'
        } ${sizeStyles[size] || sizeStyles.md}`}
      />

      <div className="absolute right-2.5 flex items-center gap-1">
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors focus-visible:outline-none"
            aria-label="Clear search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {onSubmit && value.trim() && (
          <button
            type="submit"
            className="p-1 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors focus-visible:outline-none"
            aria-label="Submit search"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
