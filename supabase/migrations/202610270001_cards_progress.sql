-- Private per-Google-account Cards saves. Browser roles have no table access.
begin;
create table if not exists public.cards_progress (
  owner text primary key check (owner ~ '^[a-f0-9]{64}$'),
  revision bigint not null check (revision > 0),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000),
  updated_at timestamptz not null default now()
);
alter table public.cards_progress enable row level security;
revoke all on public.cards_progress from public, anon, authenticated;
grant select,insert,update on public.cards_progress to service_role;
notify pgrst,'reload schema';
commit;
