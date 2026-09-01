'use client';

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeSwitcher() {
  const [theme, setTheme] = React.useState('light');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // Check initial theme from localStorage or system on mount
    const storedTheme = localStorage.getItem('vivid-art-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    
    // Sync the DOM immediately
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Update React state
    setTheme(nextTheme);
    
    // Persist in localStorage
    localStorage.setItem('vivid-art-theme', nextTheme);
    
    // Hard manipulate DOM instantly for Tailwind
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Prevent layout shift before client script executes
  if (!mounted) {
    return <button className="p-2 rounded-full w-10 h-10 border border-transparent opacity-0 cursor-default" aria-hidden="true" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:scale-105 transition-all flex items-center justify-center w-10 h-10 border border-slate-300 dark:border-slate-700 shadow-sm"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700" />
      )}
    </button>
  );
}
