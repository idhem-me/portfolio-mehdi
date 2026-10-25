begin;
alter table public.tetris_scores add column if not exists avatar text;
create table if not exists public.tetris_profiles(owner text primary key,name text not null check(char_length(name) between 2 and 20),avatar text,updated bigint not null);
create table if not exists public.tetris_local_scores(id text primary key,owner text not null,score bigint not null,lines integer not null,created bigint not null);
create index if not exists tetris_local_scores_owner_created on public.tetris_local_scores(owner,created desc);
alter table public.tetris_profiles enable row level security;
alter table public.tetris_local_scores enable row level security;
revoke all on public.tetris_profiles,public.tetris_local_scores from public,anon,authenticated;
grant select,insert,update,delete on public.tetris_profiles,public.tetris_local_scores to service_role;
create or replace function public.tetris_commit_score_v3(p_id text,p_owner text,p_record_owner text,p_name text,p_score bigint,p_lines integer,p_avatar text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_count integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
 update public.tetris_sessions set used=true where id=p_id and owner=p_owner and not used and created>v_now-86400000;
 get diagnostics v_count=row_count; if v_count<>1 then raise exception 'tetris_session_used'; end if;
 insert into public.tetris_scores as current(owner,name,score,lines,created,avatar) values(p_record_owner,p_name,p_score,p_lines,v_now,p_avatar)
 on conflict(owner) do update set name=excluded.name,score=excluded.score,lines=excluded.lines,created=excluded.created,avatar=coalesce(excluded.avatar,current.avatar)
 where excluded.score>current.score or (excluded.score=current.score and excluded.lines>current.lines);
end $$;
create or replace function public.tetris_leaderboard_v3()
returns table(name text,score bigint,lines integer,avatar text,rank bigint) language sql security invoker set search_path = '' as $$
 select s.name,s.score,s.lines,s.avatar,rank() over(order by s.score desc,s.lines desc) from public.tetris_scores s where s.created>floor(extract(epoch from clock_timestamp())*1000)::bigint-7776000000 order by s.score desc,s.lines desc,s.created asc limit 20;
$$;
create or replace function public.tetris_get_profile(p_owner text) returns table(name text,avatar text) language sql security invoker set search_path='' as $$ select p.name,p.avatar from public.tetris_profiles p where p.owner=p_owner; $$;
create or replace function public.tetris_save_profile(p_owner text,p_name text,p_avatar text) returns table(name text,avatar text) language plpgsql security invoker set search_path='' as $$
begin
 if char_length(p_name)<2 or char_length(p_name)>20 or p_name !~ '^[[:alnum:] ._-]+$' then raise exception 'tetris_invalid_profile'; end if;
 if p_avatar is not null and (length(p_avatar)>250000 or p_avatar !~ '^data:image/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$') then raise exception 'tetris_invalid_avatar'; end if;
 insert into public.tetris_profiles as current(owner,name,avatar,updated) values(p_owner,p_name,p_avatar,floor(extract(epoch from clock_timestamp())*1000)::bigint)
 on conflict(owner) do update set name=excluded.name,avatar=excluded.avatar,updated=excluded.updated;
 return query select p.name,p.avatar from public.tetris_profiles p where p.owner=p_owner;
end $$;
create or replace function public.tetris_commit_local_score(p_id text,p_owner text,p_score bigint,p_lines integer) returns void language plpgsql security invoker set search_path='' as $$
declare v_count integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
 update public.tetris_sessions set used=true where id=p_id and owner=p_owner and not used and created>v_now-86400000;
 get diagnostics v_count=row_count; if v_count<>1 then raise exception 'tetris_session_used'; end if;
 insert into public.tetris_local_scores(id,owner,score,lines,created) values(p_id,p_owner,p_score,p_lines,v_now);
end $$;
revoke all on function public.tetris_commit_score_v3(text,text,text,text,bigint,integer,text),public.tetris_leaderboard_v3(),public.tetris_get_profile(text),public.tetris_save_profile(text,text,text),public.tetris_commit_local_score(text,text,bigint,integer) from public,anon,authenticated;
grant execute on function public.tetris_commit_score_v3(text,text,text,text,bigint,integer,text),public.tetris_leaderboard_v3(),public.tetris_get_profile(text),public.tetris_save_profile(text,text,text),public.tetris_commit_local_score(text,text,bigint,integer) to service_role;
notify pgrst,'reload schema'; commit;
