import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-5 py-4 rounded-2xl glass focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white placeholder:text-zinc-600 ${
            error ? 'ring-2 ring-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
