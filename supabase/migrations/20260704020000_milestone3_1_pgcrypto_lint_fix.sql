create extension if not exists pgcrypto with schema extensions;

create or replace function public.hash_invite_token(p_token text)
returns text
language sql
immutable
strict
as $$
  select encode(extensions.digest(p_token, 'sha256'::text), 'hex');
$$;

create or replace function public.generate_invite_token()
returns text
language sql
volatile
as $$
  select translate(replace(encode(extensions.gen_random_bytes(18), 'base64'), '=', ''), '+/', '-_');
$$;
