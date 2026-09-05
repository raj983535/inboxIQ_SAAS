import React from 'react';
import { cn } from '@/lib/utils';

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-b border-neutral-100 dark:border-neutral-800/60', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3 className={cn('text-lg font-semibold text-neutral-900 dark:text-neutral-100', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn('text-xs text-neutral-500 dark:text-neutral-400 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div className={cn('px-6 py-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-b-xl flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}
