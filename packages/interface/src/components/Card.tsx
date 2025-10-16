import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = ({ children, glass = true, className = '', ...props }: CardProps) => {
  return (
    <div
      className={`rounded-2xl p-6 ${glass ? 'glass' : 'bg-zinc-100'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
