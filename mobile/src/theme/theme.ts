import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const colors = {
  primary: '#004583',
  onPrimary: '#ffffff',
  primaryContainer: '#005dac',
  onPrimaryContainer: '#bfd7ff',
  secondary: '#1b6d24',
  secondaryContainer: '#a0f399',
  onSecondaryContainer: '#217128',
  tertiary: '#623e00',
  tertiaryContainer: '#815300',
  surface: '#f7f9fb',
  onSurface: '#191c1e',
  onSurfaceVariant: '#414751',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f4f6',
  surfaceContainer: '#eceef0',
  surfaceContainerHigh: '#e6e8ea',
  surfaceContainerHighest: '#e0e3e5',
  outline: '#727783',
  outlineVariant: '#c1c6d3',
  error: '#ba1a1a',
  warning: '#FFB703',
  success: '#2E7D32',
  // Additional design system colors
  primaryFixed: '#d4e3ff',
  secondaryFixed: '#a3f69c',
  tertiaryFixed: '#ffddb5',
};

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.primaryContainer,
    onPrimaryContainer: colors.onPrimaryContainer,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryContainer,
    tertiary: colors.tertiary,
    tertiaryContainer: colors.tertiaryContainer,
    surface: colors.surface,
    background: colors.surface,
    outline: colors.outline,
    outlineVariant: colors.outlineVariant,
    error: colors.error,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  screenEdge: 16,
};