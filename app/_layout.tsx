import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppThemeProvider, useAppTheme } from "@/design-system/theme";
import { AuthProvider } from "@/state/AuthProvider";
import { PredicteMockProvider } from "@/state/PredicteMockProvider";

export default function RootLayout(): React.ReactNode {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <AuthProvider>
          <PredicteMockProvider>
            <RootStack />
          </PredicteMockProvider>
        </AuthProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootStack(): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: { fontWeight: "800" }
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="league/[leagueId]" options={{ headerShown: false }} />
        <Stack.Screen name="invite/[inviteCode]" options={{ title: "Invito" }} />
      </Stack>
    </>
  );
}
