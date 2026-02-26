"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize with null to avoid hydration mismatch (server renders null/light, client matches)
  const [theme, setTheme] = useState<Theme | null>(null);

  // Initialize theme from storage or system preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') {
      // eslint-disable-next-line
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light'); // Default to light if nothing found
    }
  }, []);

  // Sync theme changes to DOM and localStorage
  useEffect(() => {
    if (!theme) return; // Don't sync if theme hasn't been initialized

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // While theme is initializing (null), render children with default light theme context
  // This avoids flash of wrong content structure, but may cause flash of wrong theme style
  // which is acceptable for simple implementations or fixable with script injection.
  // We use 'light' as fallback for context value.

  return (
    <ThemeContext.Provider value={{ theme: theme || 'light', toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
