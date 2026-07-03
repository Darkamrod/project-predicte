export interface ColorTokens {
  background: string;
  surface: string;
  surfaceVariant: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  success: string;
  onSuccess: string;
  error: string;
  onError: string;
  warning: string;
  onWarning: string;
  trophy: string;
  onTrophy: string;
}

export const lightColors: ColorTokens = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceVariant: "#F1F5F9",
  textPrimary: "#111827",
  textSecondary: "#475569",
  border: "#CBD5E1",
  primary: "#1D4ED8",
  onPrimary: "#FFFFFF",
  primaryContainer: "#DBEAFE",
  onPrimaryContainer: "#1E3A8A",
  success: "#15803D",
  onSuccess: "#FFFFFF",
  error: "#B91C1C",
  onError: "#FFFFFF",
  warning: "#C2410C",
  onWarning: "#FFFFFF",
  trophy: "#A16207",
  onTrophy: "#FFFFFF"
};

export const darkColors: ColorTokens = {
  background: "#0F172A",
  surface: "#1E293B",
  surfaceVariant: "#334155",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  border: "#475569",
  primary: "#60A5FA",
  onPrimary: "#0F172A",
  primaryContainer: "#1E3A8A",
  onPrimaryContainer: "#DBEAFE",
  success: "#4ADE80",
  onSuccess: "#0F172A",
  error: "#F87171",
  onError: "#0F172A",
  warning: "#FB923C",
  onWarning: "#0F172A",
  trophy: "#FBBF24",
  onTrophy: "#0F172A"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999
} as const;

export const touchTarget = {
  minHeight: 48,
  icon: 44
} as const;
