begin;
create table if not exists public.tetris_score_receipts(id text primary key,owner text not null,target text not null,score bigint not null,lines integer not null);
alter table public.tetris_score_receipts enable row level security;
revoke all on public.tetris_score_receipts from public,anon,authenticated;
grant select,insert on public.tetris_score_receipts to service_role;
create or replace function public.tetris_score_receipt(p_id text,p_owner text,p_target text) returns table(score bigint,lines integer) language sql security invoker set search_path='' as $$ select r.score,r.lines from public.tetris_score_receipts r where r.id=p_id and r.owner=p_owner and r.target=p_target; $$;
revoke all on function public.tetris_score_receipt(text,text,text) from public,anon,authenticated;
grant execute on function public.tetris_score_receipt(text,text,text) to service_role;
create or replace function public.tetris_commit_score_v3(p_id text,p_owner text,p_record_owner text,p_name text,p_score bigint,p_lines integer,p_avatar text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_count integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id,0));
 if exists(select 1 from public.tetris_score_receipts where id=p_id and owner=p_owner and target=p_record_owner) then return; end if;
 update public.tetris_sessions set used=true where id=p_id and owner=p_owner and not used and created>v_now-86400000;
 get diagnostics v_count=row_count; if v_count<>1 then raise exception 'tetris_session_used'; end if;
 insert into public.tetris_scores as current(owner,name,score,lines,created,avatar) values(p_record_owner,p_name,p_score,p_lines,v_now,p_avatar)
 on conflict(owner) do update set name=excluded.name,score=excluded.score,lines=excluded.lines,created=excluded.created,avatar=coalesce(excluded.avatar,current.avatar)
 where excluded.score>current.score or (excluded.score=current.score and excluded.lines>current.lines);
 insert into public.tetris_score_receipts values(p_id,p_owner,p_record_owner,p_score,p_lines);
end $$;
create or replace function public.tetris_commit_local_score(p_id text,p_owner text,p_score bigint,p_lines integer) returns void language plpgsql security invoker set search_path='' as $$
declare v_count integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id,0));
 if exists(select 1 from public.tetris_score_receipts where id=p_id and owner=p_owner and target='local:'||p_owner) then return; end if;
 update public.tetris_sessions set used=true where id=p_id and owner=p_owner and not used and created>v_now-86400000;
 get diagnostics v_count=row_count; if v_count<>1 then raise exception 'tetris_session_used'; end if;
 insert into public.tetris_local_scores(id,owner,score,lines,created) values(p_id,p_owner,p_score,p_lines,v_now);
 insert into public.tetris_score_receipts values(p_id,p_owner,'local:'||p_owner,p_score,p_lines);
end $$;
create or replace function public.tetris_commit_score(p_id text,p_owner text,p_name text,p_score bigint,p_lines integer) returns void language sql security invoker set search_path='' as $$ select public.tetris_commit_score_v3(p_id,p_owner,p_owner,p_name,p_score,p_lines,null); $$;
create or replace function public.tetris_save_profile(p_owner text,p_name text,p_avatar text) returns table(name text,avatar text) language plpgsql security invoker set search_path='' as $$
begin
 if char_length(p_name)<2 or char_length(p_name)>20 or p_name !~ '^[[:alnum:] ._-]+$' then raise exception 'tetris_invalid_profile'; end if;
 if p_avatar is not null and (length(p_avatar)>250000 or (p_avatar !~ '^data:image/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$' and p_avatar !~ '^https://([a-zA-Z0-9-]+\.)*googleusercontent\.com/')) then raise exception 'tetris_invalid_avatar'; end if;
 insert into public.tetris_profiles as current(owner,name,avatar,updated) values(p_owner,p_name,p_avatar,floor(extract(epoch from clock_timestamp())*1000)::bigint)
 on conflict(owner) do update set name=excluded.name,avatar=excluded.avatar,updated=excluded.updated;
 return query select p.name,p.avatar from public.tetris_profiles p where p.owner=p_owner;
end $$;
notify pgrst,'reload schema'; commit;
