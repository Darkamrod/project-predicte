import type { User } from "@supabase/supabase-js";

import { requireSupabaseClient } from "./client";

export interface SupabaseProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  locale: string;
  timezone: string;
}

export interface ProfileUpdateInput {
  displayName: string;
  avatarUrl?: string;
  locale: string;
  timezone: string;
}

export async function getOwnProfile(userId: string): Promise<SupabaseProfile | undefined> {
  const client = requireSupabaseClient();
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? {
        id: data.id,
        displayName: data.display_name,
        locale: data.locale,
        timezone: data.timezone,
        ...(data.avatar_url ? { avatarUrl: data.avatar_url } : {})
      }
    : undefined;
}

export async function ensureOwnProfile(user: User): Promise<SupabaseProfile> {
  const existing = await getOwnProfile(user.id);

  if (existing) {
    return existing;
  }

  const metadata = user.user_metadata;
  const displayName =
    readMetadataString(metadata, "display_name") ??
    readMetadataString(metadata, "full_name") ??
    user.email?.split("@")[0] ??
    "Nuovo utente";
  const avatarUrl =
    readMetadataString(metadata, "avatar_url") ?? readMetadataString(metadata, "picture");

  return upsertOwnProfile(user.id, {
    displayName,
    locale: "it-IT",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    ...(avatarUrl ? { avatarUrl } : {})
  });
}

export async function upsertOwnProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<SupabaseProfile> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .upsert({
      id: userId,
      display_name: input.displayName,
      avatar_url: input.avatarUrl ?? null,
      locale: input.locale,
      timezone: input.timezone
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    displayName: data.display_name,
    locale: data.locale,
    timezone: data.timezone,
    ...(data.avatar_url ? { avatarUrl: data.avatar_url } : {})
  };
}

function readMetadataString(metadata: User["user_metadata"], key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
