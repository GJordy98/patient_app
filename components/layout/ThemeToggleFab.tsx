"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

const ThemeToggleFab = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className="fixed bottom-6 right-6 z-9999 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none"
      style={{
        backgroundColor: isDark ? '#fbbf24' : '#1e293b',
        color: isDark ? '#1e293b' : '#fbbf24',
        boxShadow: isDark 
          ? '0 4px 20px rgba(251, 191, 36, 0.4)' 
          : '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '22px', width: '22px', height: '22px' }}>
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em' }}>
        {isDark ? 'Clair' : 'Sombre'}
      </span>
    </button>
  );
};

export default ThemeToggleFab;
