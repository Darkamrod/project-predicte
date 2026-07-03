import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Provider, Session } from "@supabase/supabase-js";

import { requireSupabaseClient } from "./client";

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = Extract<Provider, "google" | "apple">;

export async function signInWithOAuthProvider(
  provider: OAuthProvider
): Promise<Session | undefined> {
  const client = requireSupabaseClient();
  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error(`Supabase did not return an OAuth URL for ${provider}.`);
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    return undefined;
  }

  return completeOAuthCallback(result.url);
}

export async function completeOAuthCallback(callbackUrl: string): Promise<Session> {
  const client = requireSupabaseClient();
  const params = parseCallbackParams(callbackUrl);
  const code = params.get("code");

  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error("OAuth callback completed without a Supabase session.");
    }

    return data.session;
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (accessToken && refreshToken) {
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error("OAuth token callback completed without a Supabase session.");
    }

    return data.session;
  }

  throw new Error("OAuth callback did not include an authorization code or session tokens.");
}

export async function signOutOfSupabase(): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

function parseCallbackParams(callbackUrl: string): URLSearchParams {
  const url = new URL(callbackUrl);
  const params = new URLSearchParams(url.search);

  if (url.hash.startsWith("#")) {
    const hashParams = new URLSearchParams(url.hash.slice(1));

    for (const [key, value] of hashParams.entries()) {
      params.set(key, value);
    }
  }

  return params;
}
