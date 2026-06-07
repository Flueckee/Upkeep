import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_PRIMARY = '#5C6EFF';

export function computePrimaryLight(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const α = 0.10;
  const blend = (ch: number) => Math.round(255 * (1 - α) + ch * α);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(blend(r))}${toHex(blend(g))}${toHex(blend(b))}`.toUpperCase();
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface ThemeContextValue {
  primaryColor: string;
  primaryLight: string;
  setPrimaryColor: (color: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  primaryColor: DEFAULT_PRIMARY,
  primaryLight: computePrimaryLight(DEFAULT_PRIMARY),
  setPrimaryColor: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_PRIMARY);

  useEffect(() => {
    AsyncStorage.getItem('user_primary_color')
      .then(stored => { if (stored) setPrimaryColorState(stored); })
      .catch(() => {});
  }, []);

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    AsyncStorage.setItem('user_primary_color', color).catch(() => {});
  };

  const primaryLight = computePrimaryLight(primaryColor);

  return (
    <ThemeContext.Provider value={{ primaryColor, primaryLight, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
