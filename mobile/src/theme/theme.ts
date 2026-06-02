import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const colors = {
  primary: '#004349',
  onPrimary: '#FFFFFF',
  primaryContainer: '#ABEAF0',
  onPrimaryContainer: '#002023',
  secondary: '#436182',
  secondaryContainer: '#D1E4FF',
  tertiary: '#5C310D',
  tertiaryContainer: '#FFDCC6',
  surface: '#F8F9FA',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F4F5',
  surfaceContainer: '#EDEEEF',
  surfaceContainerHigh: '#E7E8E9',
  outline: '#6F797A',
  outlineVariant: '#BFC8C9',
  error: '#BA1A1A',
  warning: '#FFB703',
  success: '#2E7D32',
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
  md: 12,
  lg: 16,
  xl: 24,
  section: 40,
};
