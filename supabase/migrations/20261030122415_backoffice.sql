create table public.visitors(id uuid primary key,consented_at timestamptz not null default now(),country text,device text,browser text,lang text);
create table public.sessions(id uuid primary key,visitor_id uuid not null references public.visitors on delete cascade,short_label text not null,started_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),active_ms bigint not null default 0 check (active_ms>=0),mouse_px bigint not null default 0 check (mouse_px>=0),scroll_px bigint not null default 0 check (scroll_px>=0),clicks bigint not null default 0 check (clicks>=0),key_presses bigint not null default 0 check (key_presses>=0),brush_strokes bigint not null default 0 check (brush_strokes>=0),colors_used bigint not null default 0 check (colors_used>=0),games_played bigint not null default 0 check (games_played>=0),cta_clicks bigint not null default 0 check (cta_clicks>=0),theme_toggles bigint not null default 0 check (theme_toggles>=0),lang_changes bigint not null default 0 check (lang_changes>=0),pages jsonb not null default '{}',games jsonb not null default '[]',country text,device text,browser text,width text);
create index on public.sessions(started_at desc);
create index on public.sessions(last_seen_at desc);
create index on public.sessions(visitor_id);
create index on public.sessions(country);
create index on public.sessions(device);
create index on public.sessions using gin(pages);
create table public.backoffice_batches(id uuid primary key,created_at timestamptz default now());
create table public.backoffice_revoked(id text primary key,created_at timestamptz default now());
alter table public.visitors enable row level security; revoke all on public.visitors from anon, authenticated; grant all on public.visitors to service_role;
alter table public.sessions enable row level security; revoke all on public.sessions from anon, authenticated; grant all on public.sessions to service_role;
alter table public.backoffice_batches enable row level security; revoke all on public.backoffice_batches from anon, authenticated; grant all on public.backoffice_batches to service_role;
alter table public.backoffice_revoked enable row level security; revoke all on public.backoffice_revoked from anon, authenticated; grant all on public.backoffice_revoked to service_role;

create function public.apply_session_delta(p jsonb,country_code text) returns void language plpgsql security invoker set search_path=public as $$
declare v uuid := (p->>'visitor_id')::uuid; s uuid := (p->>'session_id')::uuid; n integer;
begin
perform pg_advisory_xact_lock(hashtextextended(v::text,0));
if exists(select 1 from backoffice_revoked where id=md5(v::text)) then return; end if;
insert into backoffice_batches(id) values((p->>'batch_id')::uuid) on conflict do nothing;
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
create function public.delete_backoffice_visitor(v uuid) returns void language plpgsql security invoker set search_path=public as $$
begin
perform pg_advisory_xact_lock(hashtextextended(v::text,0));
insert into backoffice_revoked(id) values(md5(v::text)) on conflict do nothing;
delete from visitors where id=v;
end $$;
create function public.backoffice_stats(date_from timestamptz,date_to timestamptz) returns jsonb language sql security invoker set search_path=public as $$
with current_period as(select * from sessions where started_at>=date_from and started_at<date_to),
previous_period as(select * from sessions where started_at>=date_from-(date_to-date_from) and started_at<date_from)
select jsonb_build_object(
'current',(select jsonb_build_object('visitors',count(distinct visitor_id),'sessions',count(*),'active_ms',coalesce(avg(active_ms),0),'mouse_px',coalesce(sum(mouse_px),0),'clicks',coalesce(sum(clicks),0),'games_played',coalesce(sum(games_played),0)) from current_period),
'previous',(select jsonb_build_object('visitors',count(distinct visitor_id),'sessions',count(*),'active_ms',coalesce(avg(active_ms),0),'mouse_px',coalesce(sum(mouse_px),0),'clicks',coalesce(sum(clicks),0),'games_played',coalesce(sum(games_played),0)) from previous_period),
'online',(select count(*) from sessions where last_seen_at>now()-interval '2 minutes'),
'series',(select coalesce(jsonb_agg(x),'[]') from (select date_trunc(case when date_to-date_from<=interval '1 day' then 'hour' else 'day' end,started_at) as label,count(*) as value from current_period group by 1 order by 1) x),
'pages',(select coalesce(jsonb_agg(x),'[]') from (select key label,sum(value::bigint) value from current_period,jsonb_each_text(pages) group by key order by 2 desc limit 5)x),
'devices',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(device,'unknown') label,count(*) value from current_period group by 1)x),
'countries',(select coalesce(jsonb_agg(x),'[]') from (select coalesce(country,'unknown') label,count(*) value from current_period group by 1 order by 2 desc)x)
) $$;
create table public.backoffice_windows(day date not null,days integer not null,stats jsonb not null,primary key(day,days));
alter table public.backoffice_windows enable row level security;
revoke all on public.backoffice_windows from anon,authenticated;
grant all on public.backoffice_windows to service_role;
create function public.purge_backoffice() returns void language plpgsql security invoker set search_path=public as $$
declare d integer;
begin
for d in select unnest(array[1,7,30,90]) loop
insert into backoffice_windows(day,days,stats)
select (now() at time zone 'UTC')::date,d,backoffice_stats(date_trunc('day',now())-make_interval(days=>d),date_trunc('day',now()))->'current'
on conflict(day,days) do nothing;
end loop;
delete from backoffice_windows where day < current_date-180;
delete from sessions where started_at<now()-interval '90 days';
delete from visitors where not exists(select 1 from sessions where visitor_id=visitors.id);
delete from backoffice_batches where created_at<now()-interval '90 days';
end $$;
revoke all on function public.apply_session_delta(jsonb,text) from public,anon,authenticated; grant execute on function public.apply_session_delta(jsonb,text) to service_role;
revoke all on function public.delete_backoffice_visitor(uuid) from public,anon,authenticated; grant execute on function public.delete_backoffice_visitor(uuid) to service_role;
revoke all on function public.backoffice_stats(timestamptz,timestamptz) from public,anon,authenticated; grant execute on function public.backoffice_stats(timestamptz,timestamptz) to service_role;
revoke all on function public.purge_backoffice() from public,anon,authenticated; grant execute on function public.purge_backoffice() to service_role;

alter function public.backoffice_stats(timestamptz,timestamptz) rename to backoffice_live_stats;
create function public.backoffice_stats(date_from timestamptz,date_to timestamptz) returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb; old_stats jsonb; days integer;
begin
days:=round(extract(epoch from date_to-date_from)/86400);
if days=90 then
date_to:=date_trunc('day',date_to); date_from:=date_to-interval '90 days';
end if;
result:=backoffice_live_stats(date_from,date_to);
if days=90 then
select stats into old_stats from backoffice_windows where day=date_from::date and backoffice_windows.days=90;
result:=jsonb_set(result,'{previous}',coalesce(old_stats,'null'::jsonb));
end if;
return result;
end $$;
revoke all on function public.backoffice_stats(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.backoffice_stats(timestamptz,timestamptz) to service_role;
create function public.backoffice_filter_options() returns jsonb language sql security invoker set search_path=public as $$
select jsonb_build_object(
'countries',(select coalesce(jsonb_agg(country),'[]') from (select distinct country from sessions where country is not null order by country)x),
'paths',(select coalesce(jsonb_agg(path),'[]') from (select distinct jsonb_object_keys(pages) path from sessions order by 1)x)
) $$;
revoke all on function public.backoffice_filter_options() from public,anon,authenticated;
grant execute on function public.backoffice_filter_options() to service_role;
