'use client';

import { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import stylisRTLPlugin from 'stylis-plugin-rtl';
import { lightTheme } from '@/styles/theme/lightTheme';
import { darkTheme } from '@/styles/theme/darkTheme';

type ThemeMode = 'light' | 'dark';
type Direction = 'rtl' | 'ltr';

interface ThemeContextType {
  mode: ThemeMode;
  direction: Direction;
  toggleTheme: () => void;
  setDirection: (dir: Direction) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  direction: 'rtl',
  toggleTheme: () => {},
  setDirection: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
  locale: string;
}

export default function ThemeProvider({
  children,
  locale,
}: ThemeProviderProps) {
  // Initialize mode from localStorage using lazy initializer
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('themeMode') as ThemeMode;
      return savedMode || 'light';
    }
    return 'light';
  });
  
  const [direction, setDirection] = useState<Direction>(
    locale === 'ar' ? 'rtl' : 'ltr'
  );
  const [mounted, setMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update direction based on locale
  useEffect(() => {
    const newDirection = locale === 'ar' ? 'rtl' : 'ltr';
    setDirection(newDirection);
    document.documentElement.dir = newDirection;
    document.documentElement.lang = locale;
  }, [locale]);

  // Update theme mode in localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('themeMode', mode);
    }
  }, [mode, mounted]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Create RTL cache
  const cacheRtl = useMemo(
    () =>
      createCache({
        key: direction === 'rtl' ? 'muirtl' : 'muiltr',
        stylisPlugins: direction === 'rtl' ? [stylisRTLPlugin] : [],
        prepend: true,
      }),
    [direction]
  );

  // Select theme based on mode and direction
  const theme = useMemo(() => {
    const baseTheme = mode === 'light' ? lightTheme : darkTheme;
    return {
      ...baseTheme,
      direction,
    };
  }, [mode, direction]);

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, direction, toggleTheme, setDirection }}>
      <CacheProvider value={cacheRtl}>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </CacheProvider>
    </ThemeContext.Provider>
  );
}

