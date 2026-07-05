import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/services/supabase/database.types";

export interface TrustedServerSupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export function createTrustedServerSupabaseClient(
  config: TrustedServerSupabaseConfig
): SupabaseClient<Database> {
  if (!config.url.trim() || !config.serviceRoleKey.trim()) {
    throw new Error("Trusted Supabase server config requires URL and service-role key.");
  }

  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    global: {
      headers: {
        "X-Client-Info": "project-predicte-trusted-scoring-worker"
      }
    }
  });
}
