import { Platform } from 'react-native';
import { blue, gray, navy, status } from './palette';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  family: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 30,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

const lightColors = {
  background: gray[50],
  surface: gray[0],
  surfaceAlt: gray[100],
  border: gray[200],
  text: navy[900],
  textSecondary: gray[600],
  textMuted: gray[400],
  primary: blue[500],
  primaryDark: navy[800],
  onPrimary: gray[0],
  navy: navy[900],
  ...status,
};

const darkColors = {
  background: navy[900],
  surface: navy[800],
  surfaceAlt: navy[700],
  border: navy[600],
  text: gray[50],
  textSecondary: gray[300],
  textMuted: gray[500],
  primary: blue[400],
  primaryDark: blue[600],
  onPrimary: gray[0],
  navy: navy[900],
  ...status,
};

export const themes = {
  light: { colors: lightColors, spacing, radii, typography },
  dark: { colors: darkColors, spacing, radii, typography },
};

export type AppTheme = typeof themes.light;
export type ThemeColors = typeof lightColors;
