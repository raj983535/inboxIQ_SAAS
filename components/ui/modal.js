'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({ isOpen, onClose, title, description, children, className }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 overflow-hidden',
          className
        )}
      >
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
            {description && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Table({ children, className }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className={cn('w-full text-left text-sm', className)}>{children}</table>
    </div>
  );
}

export function TableHead({ children }) {
  return <thead className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">{children}</tbody>;
}

export function TableRow({ children, className, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className }) {
  return <td className={cn('px-4 py-3.5 text-neutral-800 dark:text-neutral-200 text-xs md:text-sm', className)}>{children}</td>;
}

export function TableHeaderCell({ children, className }) {
  return <th className={cn('px-4 py-3 text-left font-semibold', className)}>{children}</th>;
}
