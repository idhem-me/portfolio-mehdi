begin;
create or replace function cards_private.dispatch(op text,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from cards_private.save_choices where user_id=auth.uid() or source_user=auth.uid()) then raise exception 'SAVE_CHOICE_REQUIRED';end if;
 if jsonb_typeof(payload) is distinct from 'object' then raise exception 'INVALID_REQUEST';end if;
 if op='consume_booster' and coalesce((payload->>'quantity')::integer,1) not between 1 and 10 then raise exception 'OPENING_LIMIT';end if;
 if op='consume_booster' then
  if not payload ? 'maxGemCost' then payload:=payload||jsonb_build_object('maxGemCost',0);end if;
  if jsonb_typeof(payload->'maxGemCost') is distinct from 'number' or coalesce((payload->>'maxGemCost')::numeric between 0 and 1000,false) is not true or (payload->>'maxGemCost')::numeric<>trunc((payload->>'maxGemCost')::numeric) then raise exception 'INVALID_PRICE_QUOTE';end if;
 end if;
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
notify pgrst,'reload schema';
commit;


