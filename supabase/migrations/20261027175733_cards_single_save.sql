begin;
alter table public.cards_saves add column legacy_offered boolean not null default false;
create table cards_private.login_tickets(secret_hash text primary key,source_user uuid not null references public.profiles(user_id) on delete cascade,expires_at timestamptz not null);
create table cards_private.save_choices(user_id uuid primary key references public.profiles(user_id) on delete cascade,source_user uuid unique references public.profiles(user_id) on delete cascade,local_data jsonb,created_at timestamptz not null default now(),check((source_user is null)<>(local_data is null)));
alter table cards_private.login_tickets enable row level security;
alter table cards_private.save_choices enable row level security;
create function cards_private.prepare_login() returns text language plpgsql security definer set search_path='' as $$
declare uid uuid; secret text:=gen_random_uuid()::text||gen_random_uuid()::text; begin
 uid:=cards_private.ensure_player();
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) is not true then return null;end if;
 delete from cards_private.login_tickets where source_user=uid or expires_at<now();
 insert into cards_private.login_tickets values(encode(sha256(convert_to(secret,'UTF8')),'hex'),uid,now()+interval '10 minutes');
 return secret;
end;$$;
create function cards_private.claim_login(secret text) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); source uuid; had_save boolean;begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'GOOGLE_REQUIRED';end if;
 select source_user into source from cards_private.login_tickets where secret_hash=encode(sha256(convert_to(secret,'UTF8')),'hex') and expires_at>now() for update;
 if source is null then return false;end if;
 if source=uid then raise exception 'INVALID_SOURCE';end if;
 had_save:=exists(select 1 from public.cards_saves where user_id=uid);
 perform cards_private.ensure_player();
 insert into cards_private.save_choices(user_id,source_user) values(uid,source) on conflict(user_id) do nothing;
 delete from cards_private.login_tickets where source_user=source;
 return not had_save;
end;$$;
create function cards_private.choice_view() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); choice cards_private.save_choices; source_data jsonb; source_profile jsonb; source_date timestamptz; target_data public.cards_saves; source_revision bigint; begin
 select * into choice from cards_private.save_choices where user_id=uid;if not found then return null;end if;
 select * into target_data from public.cards_saves where user_id=uid;
 if choice.source_user is not null then
  select data,revision,last_played_at into source_data,source_revision,source_date from public.cards_saves where user_id=choice.source_user;
  select to_jsonb(p) into source_profile from public.profiles p where user_id=choice.source_user;
 else source_data:=choice.local_data;source_revision:=0;source_date:=to_timestamp((source_data#>>'{boosters,updatedAt}')::double precision/1000);source_profile:='{"credits":0}'::jsonb;end if;
 return jsonb_build_object('sourceUser',choice.source_user,'sourceAvatar',source_profile->>'custom_avatar_path','revision',target_data.revision,'sourceRevision',source_revision,'device',jsonb_build_object('cards',(select coalesce(sum((value->>'qty')::bigint),0) from jsonb_each(source_data->'collection')),'credits',(source_profile->>'credits')::integer,'lastPlayedAt',source_date),'account',jsonb_build_object('cards',(select coalesce(sum((value->>'qty')::bigint),0) from jsonb_each(target_data.data->'collection')),'credits',(select credits from public.profiles where user_id=uid),'lastPlayedAt',target_data.last_played_at));
end;$$;
create function cards_private.resolve_choice(keep text,expected_revision bigint,expected_source_revision bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); choice cards_private.save_choices; source_save public.cards_saves; source_profile public.profiles;target_revision bigint;begin
 if keep not in ('device','account') then raise exception 'INVALID_CHOICE';end if;
 select * into choice from cards_private.save_choices where user_id=uid for update;if not found then raise exception 'NO_CHOICE';end if;
 perform 1 from public.profiles where user_id in(uid,choice.source_user) order by user_id for update;
 select revision into target_revision from public.cards_saves where user_id=uid for update;
 if target_revision<>expected_revision then raise exception 'SAVE_CHANGED';end if;
 if choice.source_user is not null then
  select * into source_save from public.cards_saves where user_id=choice.source_user for update;
  select * into source_profile from public.profiles where user_id=choice.source_user;
  if source_save.revision<>expected_source_revision then raise exception 'SAVE_CHANGED';end if;
 end if;
 if keep='device' then
  if choice.source_user is not null then
   update public.profiles set credits=source_profile.credits,boosters_to_open=source_profile.boosters_to_open,free_boosters=source_profile.free_boosters,free_refill_at=source_profile.free_refill_at,equipped_avatar_frame=source_profile.equipped_avatar_frame,custom_avatar_enabled=source_profile.custom_avatar_enabled,custom_avatar_path=case when source_profile.custom_avatar_path is not null then uid::text||'/avatar.webp' else null end,avatar_version=avatar_version+1,theme=source_profile.theme,settings=source_profile.settings,revision=revision+1,updated_at=now() where user_id=uid;
   delete from public.user_cosmetics where user_id=uid;
   insert into public.user_cosmetics select uid,cosmetic_id,purchased_at from public.user_cosmetics where user_id=choice.source_user;
   update public.cards_saves set data=source_save.data,revision=revision+1,last_played_at=source_save.last_played_at,legacy_imported=true where user_id=uid;
  else
   update public.profiles set credits=0,boosters_to_open=0,free_boosters=(choice.local_data#>>'{boosters,available}')::integer,free_refill_at=to_timestamp((choice.local_data#>>'{boosters,updatedAt}')::double precision/1000),equipped_avatar_frame=null,custom_avatar_enabled=false,custom_avatar_path=null,theme='default',revision=revision+1,updated_at=now() where user_id=uid;
   delete from public.user_cosmetics where user_id=uid;
   update public.cards_saves set data=choice.local_data,revision=revision+1,legacy_imported=true where user_id=uid;
  end if;
 end if;
 delete from cards_private.save_choices where user_id=uid;
 if choice.source_user is not null then delete from public.profiles where user_id=choice.source_user;end if;
 delete from public.cards_progress where owner=encode(sha256(convert_to('google:'||uid::text,'UTF8')),'hex');
 return cards_private.snapshot();
end;$$;
create function cards_private.offer_legacy(candidate jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid; save public.cards_saves; empty boolean; entry record; begin
 uid:=cards_private.ensure_player();select * into save from public.cards_saves where user_id=uid for update;
 if save.legacy_offered or exists(select 1 from cards_private.save_choices where user_id=uid) then return false;end if;
 if jsonb_typeof(candidate->'collection')<>'object' or octet_length(candidate::text)>200000 then raise exception 'INVALID_SAVE';end if;
 for entry in select key,value from jsonb_each(candidate->'collection') loop
  if not exists(select 1 from cards_private.card_catalog where id=entry.key) or (entry.value->>'qty')::bigint not between 0 and 2147483647 then raise exception 'INVALID_SAVE';end if;
 end loop;
 empty:=save.data->'collection'='{}'::jsonb and (select credits=0 and boosters_to_open=0 from public.profiles where user_id=uid) and not exists(select 1 from public.user_cosmetics where user_id=uid);
 update public.cards_saves set legacy_offered=true where user_id=uid;
 insert into cards_private.save_choices(user_id,local_data) values(uid,candidate);
 if empty then perform cards_private.resolve_choice('device',save.revision,0);return true;end if;
 return false;
end;$$;
alter function cards_private.dispatch(text,jsonb,uuid) rename to dispatch_core;
revoke all on function cards_private.dispatch_core(text,jsonb,uuid) from authenticated;
create function cards_private.dispatch(op text,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from cards_private.save_choices where user_id=auth.uid() or source_user=auth.uid()) then raise exception 'SAVE_CHOICE_REQUIRED';end if;
 return cards_private.dispatch_core(op,payload,operation_id);
end;$$;
create function public.cards_prepare_login() returns text language sql security invoker set search_path='' as $$select cards_private.prepare_login();$$;
create function public.cards_claim_login(secret text) returns boolean language sql security invoker set search_path='' as $$select cards_private.claim_login(secret);$$;
create function public.cards_pending_choice() returns jsonb language sql security invoker set search_path='' as $$select cards_private.choice_view();$$;
create function public.cards_resolve_choice(keep text,expected_revision bigint,expected_source_revision bigint) returns jsonb language sql security invoker set search_path='' as $$select cards_private.resolve_choice(keep,expected_revision,expected_source_revision);$$;
create function public.cards_offer_legacy(candidate jsonb) returns boolean language sql security invoker set search_path='' as $$select cards_private.offer_legacy(candidate);$$;
revoke all on function cards_private.prepare_login(),cards_private.claim_login(text),cards_private.choice_view(),cards_private.resolve_choice(text,bigint,bigint),cards_private.offer_legacy(jsonb),cards_private.dispatch(text,jsonb,uuid) from public,anon;
grant execute on function cards_private.prepare_login(),cards_private.claim_login(text),cards_private.choice_view(),cards_private.resolve_choice(text,bigint,bigint),cards_private.offer_legacy(jsonb),cards_private.dispatch(text,jsonb,uuid) to authenticated;
revoke all on function public.cards_prepare_login(),public.cards_claim_login(text),public.cards_pending_choice(),public.cards_resolve_choice(text,bigint,bigint),public.cards_offer_legacy(jsonb) from public,anon;
grant execute on function public.cards_prepare_login(),public.cards_claim_login(text),public.cards_pending_choice(),public.cards_resolve_choice(text,bigint,bigint),public.cards_offer_legacy(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
