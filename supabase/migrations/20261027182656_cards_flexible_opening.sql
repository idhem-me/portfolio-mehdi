begin;
alter table public.cards_saves drop constraint cards_saves_data_check;
alter table public.cards_saves add constraint cards_saves_data_check check(jsonb_typeof(data)='object' and octet_length(data::text)<=20000000);
create or replace function cards_private.dispatch_core(op text,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; p public.profiles; s public.cards_saves; item cards_private.shop_catalog; previous cards_private.operations; o jsonb; result jsonb; quantity integer; free_used integer; i integer; pack jsonb; cards jsonb:='[]'; kinds jsonb:='[]'; index integer; phase text; setting jsonb; begin
 uid:=cards_private.ensure_player(); perform cards_private.snapshot();
 select * into p from public.profiles where user_id=uid for update;
 select * into s from public.cards_saves where user_id=uid for update;
 if operation_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
 select * into previous from cards_private.operations where user_id=uid and request_id=operation_id;
 if found then
  if previous.action<>op or previous.payload<>payload then raise exception 'REQUEST_ID_REUSED'; end if;
  return cards_private.snapshot();
 end if;
 if op in ('grant_credits','buy_boosters','buy_cosmetic') then
  select * into item from cards_private.shop_catalog where id=payload->>'id';
  if not found or (op='grant_credits' and item.kind<>'credits') or (op='buy_boosters' and item.kind<>'boosters') or (op='buy_cosmetic' and item.kind<>'cosmetic') then raise exception 'UNKNOWN_ITEM'; end if;
  if op='grant_credits' then update public.profiles set credits=credits+item.amount where user_id=uid;
  else
   if p.credits<item.price then raise exception 'INSUFFICIENT_CREDITS'; end if;
   if op='buy_cosmetic' and exists(select 1 from public.user_cosmetics where user_id=uid and cosmetic_id=item.id) then raise exception 'ALREADY_OWNED'; end if;
   update public.profiles set credits=credits-item.price,boosters_to_open=boosters_to_open+case when op='buy_boosters' then item.amount else 0 end where user_id=uid;
   if op='buy_cosmetic' then insert into public.user_cosmetics(user_id,cosmetic_id) values(uid,item.id); end if;
  end if;
 elsif op='consume_booster' then
  o:=s.data->'activeOpen';
  if o<>'null'::jsonb and not coalesce((o->>'finalized')::boolean,false) then raise exception 'OPENING_ACTIVE'; end if;
  quantity:=coalesce((payload->>'quantity')::integer,1);
  if quantity<1 then raise exception 'INVALID_QUANTITY'; end if;
  if p.free_boosters::bigint+p.boosters_to_open::bigint<quantity then raise exception 'INSUFFICIENT_BOOSTERS'; end if;
  free_used:=least(quantity,p.free_boosters);
  update public.profiles set free_boosters=free_boosters-free_used,boosters_to_open=boosters_to_open-(quantity-free_used) where user_id=uid;
  for i in 1..quantity loop pack:=cards_private.draw_pack(payload->>'setId'); cards:=cards||(pack->'cards'); kinds:=kinds||jsonb_build_array(pack->>'kind'); end loop;
  o:=jsonb_build_object('openId',operation_id::text,'kind',kinds->>0,'cards',cards,'phase','cutting','revealed',(select jsonb_agg(false) from generate_series(1,quantity*5)),'discovered','[]'::jsonb,'currentIndex',0,'createdAt',floor(extract(epoch from now())*1000),'finalized',false);
  if quantity>1 then o:=o||jsonb_build_object('batchKinds',kinds); end if;
  s.data:=jsonb_set(s.data,'{activeOpen}',o);
 elsif op in ('phase','discover','advance','finish','dismiss') then
  o:=s.data->'activeOpen';
  if o is null or o='null'::jsonb or o->>'openId'<>payload->>'openId' then raise exception 'OPENING_CHANGED'; end if;
  if op='dismiss' then
   if not (o->>'finalized')::boolean then raise exception 'OPENING_ACTIVE'; end if;
   s.data:=jsonb_set(s.data,'{activeOpen}','null');
  elsif not (o->>'finalized')::boolean then
   index:=coalesce((payload->>'index')::integer,0);
   if op='phase' then
    phase:=payload->>'phase';
    if phase not in ('wrapperExit','cameraZoom','revealing') then raise exception 'INVALID_PHASE'; end if;
    o:=o||jsonb_build_object('phase',phase,'cutDirection',case when payload->>'direction'='left' then 'left' else 'right' end);
   elsif op='discover' then
    if index<>(o->>'currentIndex')::integer or index>=jsonb_array_length(o->'cards') then raise exception 'STALE_CARD'; end if;
    if not coalesce(o->'discovered','[]'::jsonb) @> to_jsonb(array[index]) then o:=jsonb_set(o,'{discovered}',coalesce(o->'discovered','[]')||to_jsonb(array[index])); end if;
   elsif op='advance' then
    if index<>(o->>'currentIndex')::integer then raise exception 'STALE_CARD'; end if;
    o:=jsonb_set(o,array['revealed',index::text],'true');
    o:=o||jsonb_build_object('currentIndex',index+1);
   end if;
   s.data:=jsonb_set(s.data,'{activeOpen}',o);
   if op='finish' or (op='advance' and (o->>'currentIndex')::integer>=jsonb_array_length(o->'cards')) then s.data:=cards_private.finalize(s.data); end if;
  end if;
 elsif op='reset' then
  s.data:=cards_private.empty_save();
 elsif op='equip' then
  if payload ? 'theme' then
   if payload->>'theme' not in ('default','blue','red') then raise exception 'INVALID_THEME'; end if;
   if payload->>'theme'<>'default' and not exists(select 1 from public.user_cosmetics where user_id=uid and cosmetic_id='theme-'||(payload->>'theme')) then raise exception 'NOT_OWNED'; end if;
   update public.profiles set theme=payload->>'theme' where user_id=uid;
  end if;
  if payload ? 'frame' then
   if payload->>'frame' is not null and not exists(select 1 from public.user_cosmetics where user_id=uid and cosmetic_id=payload->>'frame' and cosmetic_id in ('frame-flowers','frame-gold','frame-shiny')) then raise exception 'NOT_OWNED'; end if;
   update public.profiles set equipped_avatar_frame=payload->>'frame' where user_id=uid;
  end if;
  if payload ? 'customAvatarEnabled' then
   if (payload->>'customAvatarEnabled')::boolean and not exists(select 1 from public.user_cosmetics where user_id=uid and cosmetic_id='custom-avatar') then raise exception 'NOT_OWNED'; end if;
   update public.profiles set custom_avatar_enabled=(payload->>'customAvatarEnabled')::boolean where user_id=uid;
  end if;
 elsif op='avatar' then
  if not exists(select 1 from public.user_cosmetics where user_id=uid and cosmetic_id='custom-avatar') then raise exception 'NOT_OWNED'; end if;
  update public.profiles set custom_avatar_path=uid::text||'/avatar.webp',avatar_version=avatar_version+1,custom_avatar_enabled=true where user_id=uid;
 elsif op='settings' then
  setting:=payload->'settings';
  if jsonb_typeof(setting)<>'object' or jsonb_typeof(setting->'sound')<>'boolean' or jsonb_typeof(setting->'haptics')<>'boolean' or jsonb_typeof(setting->'ios')<>'boolean' or (setting->>'effectsVolume')::integer not between 0 and 100 then raise exception 'INVALID_SETTINGS'; end if;
  update public.profiles set settings=setting where user_id=uid;
 else raise exception 'UNKNOWN_OPERATION'; end if;
 update public.cards_saves set data=s.data,revision=revision+1,last_played_at=now() where user_id=uid;
 update public.profiles set revision=revision+1,updated_at=now() where user_id=uid;
 insert into cards_private.operations(user_id,request_id,action,payload) values(uid,operation_id,op,payload);
 return cards_private.snapshot();
end; $$;


notify pgrst,'reload schema';
commit;

