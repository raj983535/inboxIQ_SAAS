import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function Alert({ children, variant = 'info', title, className }) {
  const variants = {
    info: {
      box: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200',
      icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
    },
    success: {
      box: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    },
    warning: {
      box: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    },
    danger: {
      box: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
    },
  };

  const selected = variants[variant] || variants.info;

  return (
    <div className={cn('p-4 rounded-xl border flex gap-3 text-sm', selected.box, className)}>
      {selected.icon}
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1 text-sm">{title}</h4>}
        <div className="text-xs leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
