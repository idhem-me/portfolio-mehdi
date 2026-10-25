-- Optional Google identity support. Apply after 202610250001.
begin;
create or replace function public.tetris_commit_score_v2(p_id text,p_owner text,p_record_owner text,p_name text,p_score bigint,p_lines integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_count integer;v_now bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  update public.tetris_sessions set used=true where id=p_id and owner=p_owner and not used and created>v_now-86400000;
  get diagnostics v_count = row_count;
  if v_count<>1 then raise exception 'tetris_session_used';end if;
  insert into public.tetris_scores as current(owner,name,score,lines,created)
    values(p_record_owner,p_name,p_score,p_lines,v_now)
    on conflict(owner) do update set name=excluded.name,score=excluded.score,lines=excluded.lines,created=excluded.created
    where excluded.score>current.score or (excluded.score=current.score and excluded.lines>current.lines);
end $$;
revoke all on function public.tetris_commit_score_v2(text,text,text,text,bigint,integer) from public,anon,authenticated;
grant execute on function public.tetris_commit_score_v2(text,text,text,text,bigint,integer) to service_role;
notify pgrst,'reload schema';
commit;
