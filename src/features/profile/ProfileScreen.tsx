import { Moon, Smartphone, Sun } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { SecondaryButton } from "@/components/Buttons";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { useAppTheme, type ThemeMode } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function ProfileScreen(): React.ReactNode {
  const { currentUser } = usePredicteMock();
  const { theme, setThemeMode } = useAppTheme();
  const modes: { mode: ThemeMode; label: string; icon: typeof Smartphone }[] = [
    { mode: "system", label: "Sistema", icon: Smartphone },
    { mode: "light", label: "Chiaro", icon: Sun },
    { mode: "dark", label: "Scuro", icon: Moon }
  ];

  return (
    <AppScreen>
      <AppHeader title={strings.tabs.profile} subtitle="Profilo mock locale." />
      <AppCard>
        <View style={styles.profileRow}>
          <ParticipantAvatar initials={currentUser.avatarInitials} />
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {currentUser.displayName}
            </Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              {currentUser.locale} - {currentUser.timezone}
            </Text>
          </View>
        </View>
      </AppCard>
      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Tema</Text>
        <View style={styles.themeButtons}>
          {modes.map((item) => (
            <SecondaryButton
              key={item.mode}
              icon={item.icon}
              label={item.label}
              onPress={() => setThemeMode(item.mode)}
            />
          ))}
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  textBlock: {
    flex: 1,
    gap: 3
  },
  title: {
    fontSize: 18,
    fontWeight: "800"
  },
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  themeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  }
});
