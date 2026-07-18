import { Tabs } from "expo-router";
import { Bell, Home, Trophy, User } from "lucide-react-native";

import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";

export default function TabsLayout(): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: theme.layout.bottomBarHeight,
          paddingBottom: theme.spacing.sm,
          paddingTop: theme.spacing.xs
        },
        tabBarLabelStyle: theme.typography.caption,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.home,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="leagues"
        options={{
          title: strings.tabs.leagues,
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: strings.tabs.notifications,
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: strings.tabs.profile,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
