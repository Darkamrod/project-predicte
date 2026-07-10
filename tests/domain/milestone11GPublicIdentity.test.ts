import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260710010000_milestone11g_public_user_profiles.sql"),
  "utf8"
);
const sanitizerSql =
  migration.match(
    /create or replace function public\.safe_public_profile_display_name[\s\S]*?\$\$;/
  )?.[0] ?? "";
const embeddedEmailPattern =
  /(^|[^A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}([^A-Z0-9._%+-]|$)/i;

describe("Milestone 11G public user identity read model", () => {
  it("creates a separate minimal public profile table with RLS", () => {
    expect(migration).toContain("create table if not exists public.public_user_profiles");
    expect(migration).toContain("user_id uuid primary key references public.profiles");
    expect(migration).toContain("display_name text not null");
    expect(migration).toContain("username text");
    expect(migration).toContain("avatar_url text");
    expect(migration).toContain(
      "alter table public.public_user_profiles enable row level security"
    );
    expect(migration).toContain("grant select on public.public_user_profiles to authenticated");
  });

  it("allows reads only for the current user or shared active league members", () => {
    expect(migration).toContain('create policy "public user profiles read self or shared league"');
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("from public.league_members target_member");
    expect(migration).toContain("target_member.status = 'active'");
    expect(migration).toContain("public.current_user_is_league_member(target_member.league_id)");
  });

  it("does not expose auth private fields or weaken the owner-only profiles policy", () => {
    expect(migration).not.toMatch(/\bauth\.users\b/i);
    expect(migration).not.toMatch(/raw_user_meta_data|user_metadata|private_metadata|phone/i);
    expect(migration).not.toMatch(/\bemail\s+(text|varchar|uuid)\b/i);
    expect(migration).not.toMatch(/\bprovider(_|\s)?id\b/i);
    expect(migration).not.toMatch(/\b(drop|alter)\s+policy\b[\s\S]*on\s+public\.profiles\b/i);
    expect(migration).not.toMatch(
      /\bgrant\s+(insert|update|delete|all)\b[\s\S]*public_user_profiles[\s\S]*authenticated/i
    );
  });

  it("syncs sanitized display names without copying private profile fields", () => {
    expect(migration).toContain("safe_public_profile_display_name");
    expect(migration).toContain("sync_public_user_profile_from_profile");
    expect(migration).toContain("profiles_sync_public_user_profile");
    expect(migration).toContain("after insert or update of display_name on public.profiles");
    expect(migration).toContain("new.display_name");
    expect(migration).toContain("avatar_url, updated_at");
    expect(migration).toContain("null,");
  });

  it("rejects embedded email-like display names before writing the public read model", () => {
    const riskyDisplayNames = [
      "Mario mario@example.com",
      "Mario <mario@example.com>",
      "mario@example.com Mario",
      "Contatto: mario@example.com"
    ];

    expect(sanitizerSql).toContain("[[:alnum:]_.%+-]+@[[:alnum:].-]+\\.[[:alpha:]]{2,}");
    expect(sanitizerSql).not.toContain("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    expect(sanitizerSql).toContain("then\n      null");
    expect(sanitizerSql).toContain("coalesce(p_display_name");
    expect(migration).toContain("coalesce(\n      public.safe_public_profile_display_name");

    for (const displayName of riskyDisplayNames) {
      expect(embeddedEmailPattern.test(displayName)).toBe(true);
    }
  });
});
