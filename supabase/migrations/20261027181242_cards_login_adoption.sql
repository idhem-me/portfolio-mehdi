begin;
create or replace function cards_private.prepare_login() returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); secret text:=gen_random_uuid()::text||gen_random_uuid()::text;begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) is not true then return null;end if;
 perform cards_private.ensure_player();
 delete from cards_private.login_tickets where source_user=uid or expires_at<now();
 insert into cards_private.login_tickets values(encode(sha256(convert_to(secret,'UTF8')),'hex'),uid,now()+interval '10 minutes');
 return secret;
end;$$;
create or replace function cards_private.claim_login(secret text) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); source uuid; had_save boolean;begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'GOOGLE_REQUIRED';end if;
 select source_user into source from cards_private.login_tickets where secret_hash=encode(sha256(convert_to(secret,'UTF8')),'hex') and expires_at>now() for update;
 if source is null then return false;end if;
 if source=uid then raise exception 'INVALID_SOURCE';end if;
 had_save:=exists(select 1 from public.cards_saves s join public.profiles p using(user_id) where s.user_id=uid and (s.data->'collection'<>'{}'::jsonb or coalesce((s.data#>>'{stats,boostersOpened}')::bigint,0)>0 or s.data->'activeOpen'<>'null'::jsonb or p.credits>0 or p.boosters_to_open>0 or p.free_boosters<10 or exists(select 1 from public.user_cosmetics c where c.user_id=uid)));
 perform cards_private.ensure_player();
 insert into cards_private.save_choices(user_id,source_user) values(uid,source) on conflict(user_id) do nothing;
 delete from cards_private.login_tickets where source_user=source;
 return not had_save;
end;$$;
notify pgrst,'reload schema';
commit;
