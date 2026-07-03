import { Moon, Smartphone, Sun } from "lucide-react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { SecondaryButton } from "@/components/Buttons";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { useAppTheme, type ThemeMode } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { useAuth } from "@/state/AuthProvider";
import { usePredicteMock } from "@/state/PredicteMockProvider";
import { useEffect, useState } from "react";

export function ProfileScreen(): React.ReactNode {
  const { currentUser } = usePredicteMock();
  const auth = useAuth();
  const { theme, setThemeMode } = useAppTheme();
  const [displayName, setDisplayName] = useState(auth.profile?.displayName ?? "");
  const modes: { mode: ThemeMode; label: string; icon: typeof Smartphone }[] = [
    { mode: "system", label: "Sistema", icon: Smartphone },
    { mode: "light", label: "Chiaro", icon: Sun },
    { mode: "dark", label: "Scuro", icon: Moon }
  ];

  useEffect(() => {
    setDisplayName(auth.profile?.displayName ?? "");
  }, [auth.profile?.displayName]);

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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Account reale</Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {auth.isConfigured ? strings.copy.supabaseConfigured : strings.copy.supabaseNotConfigured}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          Stato: {auth.session ? "sessione Supabase attiva" : "modalita mock"}
        </Text>
        {auth.errorMessage ? (
          <Text style={[styles.body, { color: theme.colors.error }]}>{auth.errorMessage}</Text>
        ) : null}
        {auth.session ? (
          <>
            <TextInput
              accessibilityLabel="Nome profilo reale"
              editable={!auth.loading}
              onChangeText={setDisplayName}
              placeholder="Nome profilo"
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  minHeight: theme.touchTarget.minHeight
                }
              ]}
              value={displayName}
            />
            <View style={styles.themeButtons}>
              <SecondaryButton
                label="Aggiorna profilo"
                onPress={() =>
                  auth.updateProfile({
                    displayName,
                    locale: "it-IT",
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
                  })
                }
              />
              <SecondaryButton label="Esci" onPress={auth.signOut} />
            </View>
          </>
        ) : (
          <View style={styles.themeButtons}>
            <SecondaryButton
              label="Google"
              onPress={() => {
                void auth.signInWithProvider("google");
              }}
            />
            <SecondaryButton
              label="Apple"
              onPress={() => {
                void auth.signInWithProvider("apple");
              }}
            />
          </View>
        )}
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
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  themeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  }
});
