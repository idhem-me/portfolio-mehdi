begin;
-- Opaque credentials and shared admission counters. No browser grants or policies.
create table public.security_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  credential_version text not null,
  expires_at timestamptz not null
);
create index on public.security_sessions(expires_at);
create table public.security_budgets (
  key text primary key check (key ~ '^[0-9a-f]{64}$'),
  count integer not null check(count >= 0),
  expires_at timestamptz not null
);
create index on public.security_budgets(expires_at);
create table public.security_leases (
  id uuid primary key,
  expires_at timestamptz not null
);
create table public.security_visitors (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  visitor_id uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null
);
create index on public.security_visitors(expires_at);
alter table public.security_sessions enable row level security;
alter table public.security_budgets enable row level security;
alter table public.security_leases enable row level security;
alter table public.security_visitors enable row level security;
revoke all on public.security_sessions,public.security_budgets,public.security_leases,public.security_visitors from public,anon,authenticated;
grant select,insert,update,delete on public.security_sessions,public.security_budgets,public.security_leases,public.security_visitors to service_role;

create function public.security_consume_budget(p_key text,p_max integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer; t timestamptz:=clock_timestamp();
begin
 if p_max not between 1 and 100000 or p_seconds not between 1 and 3600 then raise exception 'INVALID_BUDGET';end if;
 insert into public.security_budgets as b(key,count,expires_at)
 values(p_key,1,t+make_interval(secs=>p_seconds))
 on conflict(key) do update set
 count=case when b.expires_at<=t then 1 else least(b.count+1,p_max+1) end,
 expires_at=case when b.expires_at<=t then t+make_interval(secs=>p_seconds) else b.expires_at end
 returning count into n;
 return n<=p_max;
end $$;
create function public.security_acquire_lease(p_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(773893422);
 delete from public.security_leases where expires_at<=clock_timestamp();
 if (select count(*) from public.security_leases)>=4 then return false;end if;
 insert into public.security_leases values(p_id,clock_timestamp()+interval '2 minutes');
 return true;
end $$;
-- Resolve visitor identity only from a secret hash; deletion and revocation are atomic.
create function public.security_delete_visitor(p_hash text) returns void
language plpgsql security invoker set search_path='' as $$
declare v uuid;
begin
 select visitor_id into v from public.security_visitors where token_hash=p_hash for update;
 if found then
  perform public.delete_backoffice_visitor(v);
  delete from public.security_visitors where token_hash=p_hash;
 end if;
end $$;
create function public.security_cleanup() returns void
language plpgsql security invoker set search_path='' as $$
begin
 delete from public.security_budgets where expires_at<now();
 delete from public.security_leases where expires_at<now();
 delete from public.security_sessions where expires_at<now();
 delete from public.security_visitors where expires_at<now();
end $$;
revoke all on function public.security_consume_budget(text,integer,integer), public.security_acquire_lease(uuid), public.security_delete_visitor(text), public.security_cleanup() from public,anon,authenticated;
grant execute on function public.security_consume_budget(text,integer,integer), public.security_acquire_lease(uuid), public.security_delete_visitor(text), public.security_cleanup() to service_role;
alter table public.backoffice_batches add column visitor_id uuid;
create or replace function public.apply_session_delta(p jsonb,country_code text) returns void language plpgsql security invoker set search_path=public as $$
declare v uuid := (p->>'visitor_id')::uuid; s uuid := (p->>'session_id')::uuid; n integer;
begin
perform pg_advisory_xact_lock(hashtextextended(v::text,0));
if exists(select 1 from backoffice_revoked where id=md5(v::text)) then return; end if;
insert into backoffice_batches(id,visitor_id) values((p->>'batch_id')::uuid,v) on conflict do nothing;
get diagnostics n=row_count; if n=0 then return; end if;
insert into visitors(id,country,device,browser,lang) values(v,country_code,p#>>'{context,device}',p#>>'{context,browser}',p#>>'{context,lang}') on conflict do nothing;
insert into sessions(id,visitor_id,short_label,country,device,browser,width) values(s,v,'Visiteur #'||upper(substr(md5(s::text),1,6)),country_code,p#>>'{context,device}',p#>>'{context,browser}',p#>>'{context,width}') on conflict do nothing;
if not exists(select 1 from sessions where id=s and visitor_id=v) then raise exception 'Session mismatch'; end if;
update sessions set last_seen_at=now(),
active_ms=active_ms+coalesce((p#>>'{delta,active_ms}')::bigint,0),
mouse_px=mouse_px+coalesce((p#>>'{delta,mouse_px}')::bigint,0),
scroll_px=scroll_px+coalesce((p#>>'{delta,scroll_px}')::bigint,0),
clicks=clicks+coalesce((p#>>'{delta,clicks}')::bigint,0),
key_presses=key_presses+coalesce((p#>>'{delta,key_presses}')::bigint,0),
brush_strokes=brush_strokes+coalesce((p#>>'{delta,brush_strokes}')::bigint,0),
colors_used=colors_used+coalesce((p#>>'{delta,colors_used}')::bigint,0),
games_played=games_played+coalesce((p#>>'{delta,games_played}')::bigint,0),
cta_clicks=cta_clicks+coalesce((p#>>'{delta,cta_clicks}')::bigint,0),
theme_toggles=theme_toggles+coalesce((p#>>'{delta,theme_toggles}')::bigint,0),
lang_changes=lang_changes+coalesce((p#>>'{delta,lang_changes}')::bigint,0),
pages=(select coalesce(jsonb_object_agg(key,total),'{}') from (select key,sum(value::bigint) total from (select * from jsonb_each_text(sessions.pages) union all select * from jsonb_each_text(p->'pages')) x group by key) y),
games=(select coalesce(jsonb_agg(value order by ord),'[]') from (select value,ord from jsonb_array_elements(sessions.games||coalesce(p->'games','[]')) with ordinality a(value,ord) order by ord desc limit 20) x)
where id=s;
end $$;

-- Permanently close untrusted browser-save migration. Existing canonical saves survive.
revoke all on function public.cards_import_legacy_for(uuid,jsonb), cards_private.import_legacy_for(uuid,jsonb), cards_private.offer_legacy(jsonb), public.cards_offer_legacy(jsonb) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
