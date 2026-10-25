-- Run once in the Supabase SQL Editor. Dedicated names avoid other app tables.
-- Only the trusted Next.js server may read sessions or submit verified scores.
begin;
create table if not exists public.tetris_sessions (
  id text primary key, owner text not null, seed integer not null,
  created bigint not null, used boolean not null default false
);
create index if not exists tetris_sessions_owner_created on public.tetris_sessions(owner,created);
create table if not exists public.tetris_scores (
  owner text primary key, name text not null check(char_length(name) between 2 and 20),
  score bigint not null check(score >= 0), lines integer not null check(lines >= 0), created bigint not null
);
create index if not exists tetris_scores_ranking on public.tetris_scores(score desc,lines desc);
alter table public.tetris_sessions enable row level security;
alter table public.tetris_scores enable row level security;
revoke all on public.tetris_sessions,public.tetris_scores from public,anon,authenticated;
grant select,insert,update,delete on public.tetris_sessions,public.tetris_scores to service_role;

create or replace function public.tetris_start_session(p_id text,p_owner text,p_seed integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_now bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  -- Serialize the rate check + insert for this anonymous player across Functions.
  perform pg_advisory_xact_lock(hashtextextended(p_owner,0));
  delete from public.tetris_sessions where created < v_now-86400000;
  delete from public.tetris_scores where created < v_now-7776000000;
  if (select count(*) from public.tetris_sessions where owner=p_owner and created>v_now-60000) >= 10 then
    raise exception 'tetris_rate_limit';
  end if;
  insert into public.tetris_sessions(id,owner,seed,created) values(p_id,p_owner,p_seed,v_now);
end $$;

create or replace function public.tetris_read_session(p_id text,p_owner text)
returns table(seed integer,created bigint,used boolean)
language sql security invoker set search_path = '' as $$
  select s.seed,s.created,s.used from public.tetris_sessions s where s.id=p_id and s.owner=p_owner;
$$;

create or replace function public.tetris_commit_score(p_id text,p_owner text,p_name text,p_score bigint,p_lines integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
  v_now bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  update public.tetris_sessions set used=true
    where id=p_id and owner=p_owner and not used and created>v_now-86400000;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'tetris_session_used'; end if;
  -- The claim and upsert share one PostgreSQL transaction, including on failure.
  insert into public.tetris_scores as current(owner,name,score,lines,created)
    values(p_owner,p_name,p_score,p_lines,v_now)
    on conflict(owner) do update set name=excluded.name,score=excluded.score,lines=excluded.lines,created=excluded.created
    where excluded.score>current.score or (excluded.score=current.score and excluded.lines>current.lines);
end $$;

create or replace function public.tetris_leaderboard()
returns table(name text,score bigint,lines integer,rank bigint)
language sql security invoker set search_path = '' as $$
  select s.name,s.score,s.lines,rank() over(order by s.score desc,s.lines desc)
    from public.tetris_scores s
    where s.created > floor(extract(epoch from clock_timestamp())*1000)::bigint-7776000000
    order by s.score desc,s.lines desc,s.created asc limit 20;
$$;

revoke all on function public.tetris_start_session(text,text,integer),public.tetris_read_session(text,text),public.tetris_commit_score(text,text,text,bigint,integer),public.tetris_leaderboard() from public,anon,authenticated;
grant execute on function public.tetris_start_session(text,text,integer),public.tetris_read_session(text,text),public.tetris_commit_score(text,text,text,bigint,integer),public.tetris_leaderboard() to service_role;
notify pgrst, 'reload schema';
commit;
