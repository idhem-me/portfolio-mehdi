begin;

create table if not exists public.tetris_score_history (
  id text primary key,
  owner text not null,
  name text not null check(char_length(name) between 2 and 20),
  score bigint not null check(score >= 0),
  lines integer not null check(lines >= 0),
  created bigint not null,
  avatar text
);
create index if not exists tetris_score_history_ranking
  on public.tetris_score_history(score desc,lines desc,created asc);
create index if not exists tetris_score_history_owner_created
  on public.tetris_score_history(owner,created desc);
alter table public.tetris_score_history enable row level security;
revoke all on public.tetris_score_history from public,anon,authenticated;
grant select,insert,update,delete on public.tetris_score_history to service_role;

-- Preserve each existing best score as one legacy history entry.
insert into public.tetris_score_history(id,owner,name,score,lines,created,avatar)
  select 'legacy:'||owner,owner,name,score,lines,created,avatar
  from public.tetris_scores
on conflict(id) do nothing;

create or replace function public.tetris_start_session(p_id text,p_owner text,p_seed integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_now bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner,0));
  delete from public.tetris_sessions where created < v_now-86400000;
  delete from public.tetris_scores where created < v_now-7776000000;
  delete from public.tetris_score_history where created < v_now-7776000000;
  if (select count(*) from public.tetris_sessions where owner=p_owner and created>v_now-60000) >= 10 then
    raise exception 'tetris_rate_limit';
  end if;
  insert into public.tetris_sessions(id,owner,seed,created) values(p_id,p_owner,p_seed,v_now);
end $$;

-- Keep guest scores as one best result while mirroring that result into history.
create or replace function public.tetris_commit_score_v3(
  p_id text,p_owner text,p_record_owner text,p_name text,p_score bigint,
  p_lines integer,p_avatar text
) returns void language plpgsql security invoker set search_path = '' as $$
declare v_count integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id,0));
  if exists(select 1 from public.tetris_score_receipts where id=p_id and owner=p_owner and target=p_record_owner) then return; end if;
  update public.tetris_sessions set used=true
    where id=p_id and owner=p_owner and not used and created>v_now-86400000;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'tetris_session_used'; end if;
  insert into public.tetris_scores as current(owner,name,score,lines,created,avatar)
    values(p_record_owner,p_name,p_score,p_lines,v_now,p_avatar)
    on conflict(owner) do update set name=excluded.name,score=excluded.score,
      lines=excluded.lines,created=excluded.created,
      avatar=coalesce(excluded.avatar,current.avatar)
    where excluded.score>current.score or
      (excluded.score=current.score and excluded.lines>current.lines);
  insert into public.tetris_score_history as current(id,owner,name,score,lines,created,avatar)
    values('legacy:'||p_record_owner,p_record_owner,p_name,p_score,p_lines,v_now,p_avatar)
    on conflict(id) do update set name=excluded.name,score=excluded.score,
      lines=excluded.lines,created=excluded.created,
      avatar=coalesce(excluded.avatar,current.avatar)
    where excluded.score>current.score or
      (excluded.score=current.score and excluded.lines>current.lines);
  insert into public.tetris_score_receipts values(p_id,p_owner,p_record_owner,p_score,p_lines);
end $$;

create or replace function public.tetris_commit_account_score_v1(
  p_id text,p_owner text,p_record_owner text,p_name text,p_score bigint,
  p_lines integer,p_avatar text
) returns void language plpgsql security invoker set search_path = '' as $$
declare v_count integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id,0));
  if exists(select 1 from public.tetris_score_receipts where id=p_id and owner=p_owner and target=p_record_owner) then return; end if;
  update public.tetris_sessions set used=true
    where id=p_id and owner=p_owner and not used and created>v_now-86400000;
  get diagnostics v_count=row_count;
  if v_count<>1 then raise exception 'tetris_session_used'; end if;
  insert into public.tetris_scores as current(owner,name,score,lines,created,avatar)
    values(p_record_owner,p_name,p_score,p_lines,v_now,p_avatar)
    on conflict(owner) do update set name=excluded.name,score=excluded.score,
      lines=excluded.lines,created=excluded.created,
      avatar=coalesce(excluded.avatar,current.avatar)
    where excluded.score>current.score or
      (excluded.score=current.score and excluded.lines>current.lines);
  insert into public.tetris_score_history(id,owner,name,score,lines,created,avatar)
    values(p_id,p_record_owner,p_name,p_score,p_lines,v_now,p_avatar);
  insert into public.tetris_score_receipts values(p_id,p_owner,p_record_owner,p_score,p_lines);
end $$;

create or replace function public.tetris_leaderboard_v4()
returns table(id text,name text,score bigint,lines integer,avatar text,rank bigint)
language sql security invoker set search_path = '' as $$
  select s.id,s.name,s.score,s.lines,s.avatar,
    rank() over(order by s.score desc,s.lines desc)
  from public.tetris_score_history s
  where s.created>floor(extract(epoch from clock_timestamp())*1000)::bigint-7776000000
  order by s.score desc,s.lines desc,s.created asc,s.id asc limit 20;
$$;

create or replace function public.tetris_score_rank_v1(p_id text,p_owner text)
returns bigint language sql security invoker set search_path = '' as $$
  with ranked as (
    select s.id,s.owner,s.score,s.lines,s.created,
      rank() over(order by s.score desc,s.lines desc) as rank
    from public.tetris_score_history s
    where s.created>floor(extract(epoch from clock_timestamp())*1000)::bigint-7776000000
  ), top_scores as (
    select * from ranked order by score desc,lines desc,created asc,id asc limit 20
  )
  select t.rank from top_scores t
  where t.owner=p_owner and t.id in (p_id,'legacy:'||p_owner)
  order by case when t.id=p_id then 0 else 1 end limit 1;
$$;

revoke all on function public.tetris_start_session(text,text,integer),
  public.tetris_commit_score_v3(text,text,text,text,bigint,integer,text),
  public.tetris_commit_account_score_v1(text,text,text,text,bigint,integer,text),
  public.tetris_leaderboard_v4(),public.tetris_score_rank_v1(text,text)
  from public,anon,authenticated;
grant execute on function public.tetris_start_session(text,text,integer),
  public.tetris_commit_score_v3(text,text,text,text,bigint,integer,text),
  public.tetris_commit_account_score_v1(text,text,text,text,bigint,integer,text),
  public.tetris_leaderboard_v4(),public.tetris_score_rank_v1(text,text)
  to service_role;

notify pgrst,'reload schema';
commit;
