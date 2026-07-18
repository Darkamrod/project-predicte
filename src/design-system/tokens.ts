import type { TextStyle, ViewStyle } from "react-native";

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceVariant: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  accent: string;
  accentContainer: string;
  onAccentContainer: string;
  success: string;
  successContainer: string;
  onSuccess: string;
  onSuccessContainer: string;
  warning: string;
  warningContainer: string;
  onWarning: string;
  onWarningContainer: string;
  error: string;
  errorContainer: string;
  onError: string;
  onErrorContainer: string;
  info: string;
  infoContainer: string;
  onInfoContainer: string;
  disabled: string;
  onDisabled: string;
  overlay: string;
  trophy: string;
  onTrophy: string;
}

export const lightColors: ColorTokens = {
  background: "#F3F7FB",
  surface: "#FFFFFF",
  surfaceElevated: "#F8FBFF",
  surfaceVariant: "#EAF0F6",
  textPrimary: "#0C1B2A",
  textSecondary: "#42556A",
  textMuted: "#5F7185",
  border: "#D5DEE8",
  borderStrong: "#AAB8C7",
  primary: "#155EEF",
  primaryPressed: "#0B4BC4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#DFE9FF",
  onPrimaryContainer: "#123A87",
  accent: "#0F8F8B",
  accentContainer: "#D8F4F1",
  onAccentContainer: "#075B59",
  success: "#24845B",
  successContainer: "#DDF3E8",
  onSuccess: "#FFFFFF",
  onSuccessContainer: "#155C40",
  warning: "#A66108",
  warningContainer: "#FFF0D2",
  onWarning: "#FFFFFF",
  onWarningContainer: "#754304",
  error: "#C13D4A",
  errorContainer: "#FCE3E6",
  onError: "#FFFFFF",
  onErrorContainer: "#8F2631",
  info: "#2C6BA8",
  infoContainer: "#DFEEFB",
  onInfoContainer: "#214F7D",
  disabled: "#DCE4EC",
  onDisabled: "#718194",
  overlay: "rgba(5, 17, 31, 0.58)",
  trophy: "#966600",
  onTrophy: "#FFFFFF"
};

export const darkColors: ColorTokens = {
  background: "#07111F",
  surface: "#101D2E",
  surfaceElevated: "#17263A",
  surfaceVariant: "#203147",
  textPrimary: "#F5F8FC",
  textSecondary: "#B8C6D5",
  textMuted: "#8799AC",
  border: "#2D4157",
  borderStrong: "#526A82",
  primary: "#70A5FF",
  primaryPressed: "#4D89ED",
  onPrimary: "#07111F",
  primaryContainer: "#1B407B",
  onPrimaryContainer: "#E3ECFF",
  accent: "#42C7C2",
  accentContainer: "#143F43",
  onAccentContainer: "#C6FAF7",
  success: "#52C08A",
  successContainer: "#173E30",
  onSuccess: "#071A12",
  onSuccessContainer: "#CFF6E2",
  warning: "#F0B35D",
  warningContainer: "#493417",
  onWarning: "#211503",
  onWarningContainer: "#FFE8BD",
  error: "#FF8290",
  errorContainer: "#4C2029",
  onError: "#2B080D",
  onErrorContainer: "#FFD9DE",
  info: "#74B8F2",
  infoContainer: "#183852",
  onInfoContainer: "#D6ECFF",
  disabled: "#26384A",
  onDisabled: "#8292A4",
  overlay: "rgba(0, 5, 12, 0.72)",
  trophy: "#E5B94D",
  onTrophy: "#211704"
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: "900", lineHeight: 36 } satisfies TextStyle,
  title: { fontSize: 24, fontWeight: "800", lineHeight: 30 } satisfies TextStyle,
  sectionTitle: { fontSize: 18, fontWeight: "800", lineHeight: 23 } satisfies TextStyle,
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 } satisfies TextStyle,
  bodyStrong: { fontSize: 15, fontWeight: "700", lineHeight: 22 } satisfies TextStyle,
  label: { fontSize: 14, fontWeight: "700", lineHeight: 19 } satisfies TextStyle,
  caption: { fontSize: 13, fontWeight: "600", lineHeight: 18 } satisfies TextStyle,
  overline: { fontSize: 12, fontWeight: "800", lineHeight: 16 } satisfies TextStyle
} as const;

export const borders = {
  hairline: 1,
  emphasized: 2
} as const;

export const shadows = {
  none: {} satisfies ViewStyle,
  low: {
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  } satisfies ViewStyle,
  medium: {
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12
  } satisfies ViewStyle
} as const;

export const touchTarget = {
  minHeight: 48,
  compactHeight: 44,
  icon: 48
} as const;

export const layout = {
  contentMaxWidth: 760,
  screenPadding: 16,
  screenPaddingWide: 24,
  bottomBarHeight: 64
} as const;
