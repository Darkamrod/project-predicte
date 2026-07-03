import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicSupabaseConfig } from "./env";
import type { Database } from "./database.types";

let cachedClient: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> | undefined {
  const config = getPublicSupabaseConfig();

  if (!config) {
    return undefined;
  }

  if (!cachedClient) {
    cachedClient = createClient<Database>(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
        storage: AsyncStorage
      }
    });
  }

  return cachedClient;
}

export function requireSupabaseClient(): SupabaseClient<Database> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return client;
}
