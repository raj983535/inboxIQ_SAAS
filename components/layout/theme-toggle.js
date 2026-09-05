'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-800" />;
  }

  return (
    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
          theme === 'light'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
        title="Light Mode"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
        title="Dark Mode"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
        }`}
        title="System Preference"
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
