import { Stack } from "expo-router";

import { useAppTheme } from "@/design-system/theme";

export default function LeagueLayout(): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: theme.typography.bodyStrong
      }}
    >
      <Stack.Screen name="index" options={{ title: "Panoramica" }} />
      <Stack.Screen name="predictions" options={{ title: "Pronostici" }} />
      <Stack.Screen name="leaderboard" options={{ title: "Classifica" }} />
      <Stack.Screen name="participants" options={{ title: "Partecipanti" }} />
      <Stack.Screen name="rules" options={{ title: "Regolamento" }} />
    </Stack>
  );
}
