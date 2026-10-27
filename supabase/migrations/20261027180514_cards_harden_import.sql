begin;
revoke all on function public.cards_offer_legacy(jsonb),cards_private.offer_legacy(jsonb) from public,anon,authenticated;
grant usage on schema cards_private to service_role;
create function cards_private.import_legacy_for(owner_id uuid,candidate jsonb) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if owner_id is null or not exists(select 1 from auth.users where id=owner_id) then raise exception 'AUTH_REQUIRED';end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 return cards_private.offer_legacy(candidate);
end;$$;
create function public.cards_import_legacy_for(owner_id uuid,candidate jsonb) returns boolean language sql security invoker set search_path='' as $$select cards_private.import_legacy_for(owner_id,candidate);$$;
revoke all on function cards_private.import_legacy_for(uuid,jsonb),public.cards_import_legacy_for(uuid,jsonb) from public,anon,authenticated;
grant execute on function cards_private.import_legacy_for(uuid,jsonb),public.cards_import_legacy_for(uuid,jsonb) to service_role;
create or replace function cards_private.dispatch(op text,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from cards_private.save_choices where user_id=auth.uid() or source_user=auth.uid()) then raise exception 'SAVE_CHOICE_REQUIRED';end if;
 if jsonb_typeof(payload) is distinct from 'object' then raise exception 'INVALID_REQUEST';end if;
 if op='phase' and coalesce(payload->>'phase' in('wrapperExit','cameraZoom','revealing'),false) is not true then raise exception 'INVALID_PHASE';end if;
 if op='settings' and (
 jsonb_typeof(payload->'settings') is distinct from 'object'
 or jsonb_typeof(payload#>'{settings,sound}') is distinct from 'boolean'
 or jsonb_typeof(payload#>'{settings,haptics}') is distinct from 'boolean'
 or jsonb_typeof(payload#>'{settings,ios}') is distinct from 'boolean'
 or jsonb_typeof(payload#>'{settings,effectsVolume}') is distinct from 'number'
 or coalesce((payload#>>'{settings,effectsVolume}')::numeric between 0 and 100,false) is not true
 ) then raise exception 'INVALID_SETTINGS';end if;
 return cards_private.dispatch_core(op,payload,operation_id);
end;$$;
-- Retire duplicate historical rows only after successful canonical import.
delete from public.cards_progress old where exists(select 1 from auth.users u join public.cards_saves s on s.user_id=u.id where s.legacy_imported and old.owner=encode(sha256(convert_to('google:'||u.id::text,'UTF8')),'hex'));
notify pgrst,'reload schema';
commit;
