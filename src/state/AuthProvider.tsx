import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { mockCurrentUser } from "@/services/auth/mockAuthAdapter";
import type { AuthUser } from "@/services/auth/types";
import {
  signInWithOAuthProvider,
  signOutOfSupabase,
  type OAuthProvider
} from "@/services/supabase/authService";
import { getSupabaseClient } from "@/services/supabase/client";
import { isSupabaseConfigured } from "@/services/supabase/env";
import {
  ensureOwnProfile,
  getOwnProfile,
  upsertOwnProfile,
  type SupabaseProfile
} from "@/services/supabase/profileService";

interface AuthContextValue {
  mode: "mock" | "supabase";
  isConfigured: boolean;
  loading: boolean;
  currentUser: AuthUser;
  session?: Session;
  profile?: SupabaseProfile;
  errorMessage?: string;
  signInWithProvider(provider: OAuthProvider): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(input: { displayName: string; locale: string; timezone: string }): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | undefined>();
  const [profile, setProfile] = useState<SupabaseProfile | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const refreshProfile = useCallback(async () => {
    const user = session?.user;

    if (!user) {
      setProfile(undefined);
      return;
    }

    const nextProfile = await getOwnProfile(user.id);
    setProfile(nextProfile);
  }, [session?.user]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return undefined;
    }

    const client = getSupabaseClient();

    if (!client) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    client.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!mounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setSession(data.session ?? undefined);

        if (data.session?.user) {
          setProfile(await ensureOwnProfile(data.session.user));
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "Errore sessione Supabase.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? undefined);

      if (!nextSession?.user) {
        setProfile(undefined);
        return;
      }

      ensureOwnProfile(nextSession.user)
        .then(setProfile)
        .catch((error: unknown) => {
          setErrorMessage(error instanceof Error ? error.message : "Errore profilo Supabase.");
        });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithProvider = useCallback(
    async (provider: OAuthProvider) => {
      setErrorMessage(undefined);

      if (!configured) {
        setErrorMessage("Configura Supabase per usare il login reale.");
        return;
      }

      const nextSession = await signInWithOAuthProvider(provider);

      if (nextSession?.user) {
        setSession(nextSession);
        setProfile(await ensureOwnProfile(nextSession.user));
      }
    },
    [configured]
  );

  const signOut = useCallback(async () => {
    setErrorMessage(undefined);

    if (!configured) {
      return;
    }

    await signOutOfSupabase();
    setSession(undefined);
    setProfile(undefined);
  }, [configured]);

  const updateProfile = useCallback(
    async (input: { displayName: string; locale: string; timezone: string }) => {
      setErrorMessage(undefined);

      if (!session?.user) {
        setErrorMessage("Accedi prima di modificare il profilo reale.");
        return;
      }

      const nextProfile = await upsertOwnProfile(session.user.id, {
        displayName: input.displayName,
        locale: input.locale,
        timezone: input.timezone
      });
      setProfile(nextProfile);
    },
    [session?.user]
  );

  const currentUser = useMemo<AuthUser>(() => {
    if (!session?.user || !profile) {
      return mockCurrentUser;
    }

    return {
      id: session.user.id,
      displayName: profile.displayName,
      avatarInitials: getInitials(profile.displayName),
      locale: "it-IT",
      timezone: profile.timezone
    };
  }, [profile, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: configured && session ? "supabase" : "mock",
      isConfigured: configured,
      loading,
      currentUser,
      ...(session ? { session } : {}),
      ...(profile ? { profile } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      signInWithProvider,
      signOut,
      updateProfile,
      refreshProfile
    }),
    [
      configured,
      currentUser,
      errorMessage,
      loading,
      profile,
      refreshProfile,
      session,
      signInWithProvider,
      signOut,
      updateProfile
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
