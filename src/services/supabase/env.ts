import Constants from "expo-constants";

interface PublicSupabaseConfig {
  url: string;
  anonKey: string;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const url = getString(process.env.EXPO_PUBLIC_SUPABASE_URL) ?? getString(extra?.supabaseUrl);
  const anonKey =
    getString(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ?? getString(extra?.supabaseAnonKey);

  if (!url || !anonKey) {
    return undefined;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getPublicSupabaseConfig() !== undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
