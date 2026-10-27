begin;
create schema if not exists cards_private;
revoke all on schema cards_private from public, anon;
grant usage on schema cards_private to authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0 check(credits>=0),
  boosters_to_open integer not null default 0 check(boosters_to_open>=0),
  free_boosters integer not null default 10 check(free_boosters between 0 and 10),
  free_refill_at timestamptz not null default now(),
  equipped_avatar_frame text,
  custom_avatar_enabled boolean not null default false,
  custom_avatar_path text,
  avatar_version bigint not null default 0,
  theme text not null default 'default' check(theme in ('default','blue','red')),
  settings jsonb not null default '{"sound":true,"effectsVolume":50,"haptics":true,"ios":false}',
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table public.user_cosmetics (
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 cosmetic_id text not null,
 purchased_at timestamptz not null default now(),
 primary key(user_id,cosmetic_id)
);
create table public.cards_saves (
 user_id uuid primary key references public.profiles(user_id) on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=200000),
 revision bigint not null default 0,
 last_played_at timestamptz not null default now(),
 legacy_imported boolean not null default false
);
create table cards_private.operations (
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 request_id uuid not null,
 action text not null,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
create table cards_private.card_catalog(id text primary key, set_id text not null, rarity text not null, number integer not null);
insert into cards_private.card_catalog values
('card-001','origins','common',1),
('card-002','origins','common',2),
('card-003','origins','common',3),
('card-004','origins','common',4),
('card-005','origins','common',5),
('card-006','origins','common',6),
('card-007','origins','common',7),
('card-008','origins','common',8),
('card-009','origins','common',9),
('card-010','origins','common',10),
('card-011','origins','common',11),
('card-012','origins','common',12),
('card-013','origins','common',13),
('card-014','origins','common',14),
('card-015','origins','common',15),
('card-016','origins','common',16),
('card-017','origins','common',17),
('card-018','origins','common',18),
('card-019','origins','common',19),
('card-020','origins','common',20),
('card-021','origins','rare',21),
('card-022','origins','rare',22),
('card-023','origins','rare',23),
('card-024','origins','rare',24),
('card-025','origins','rare',25),
('card-026','origins','rare',26),
('card-027','origins','rare',27),
('card-028','origins','rare',28),
('card-029','origins','rare',29),
('card-030','origins','rare',30),
('card-031','origins','epic',31),
('card-032','origins','epic',32),
('card-033','origins','epic',33),
('card-034','origins','epic',34),
('card-035','origins','epic',35),
('card-036','origins','epic',36),
('card-037','origins','legendary',37),
('card-038','origins','legendary',38),
('card-039','origins','gold',39),
('card-040','origins','diamond',40),
('card-041','horizons','common',41),
('card-042','horizons','common',42),
('card-043','horizons','common',43),
('card-044','horizons','common',44),
('card-045','horizons','common',45),
('card-046','horizons','common',46),
('card-047','horizons','common',47),
('card-048','horizons','common',48),
('card-049','horizons','common',49),
('card-050','horizons','common',50),
('card-051','horizons','common',51),
('card-052','horizons','common',52),
('card-053','horizons','common',53),
('card-054','horizons','common',54),
('card-055','horizons','common',55),
('card-056','horizons','common',56),
('card-057','horizons','common',57),
('card-058','horizons','common',58),
('card-059','horizons','common',59),
('card-060','horizons','common',60),
('card-061','horizons','common',61),
('card-062','horizons','common',62),
('card-063','horizons','common',63),
('card-064','horizons','common',64),
('card-065','horizons','common',65),
('card-066','horizons','common',66),
('card-067','horizons','common',67),
('card-068','horizons','common',68),
('card-069','horizons','common',69),
('card-070','horizons','common',70),
('card-071','horizons','rare',71),
('card-072','horizons','rare',72),
('card-073','horizons','rare',73),
('card-074','horizons','rare',74),
('card-075','horizons','rare',75),
('card-076','horizons','rare',76),
('card-077','horizons','rare',77),
('card-078','horizons','rare',78),
('card-079','horizons','rare',79),
('card-080','horizons','rare',80),
('card-081','horizons','rare',81),
('card-082','horizons','rare',82),
('card-083','horizons','rare',83),
('card-084','horizons','rare',84),
('card-085','horizons','rare',85),
('card-086','horizons','epic',86),
('card-087','horizons','epic',87),
('card-088','horizons','epic',88),
('card-089','horizons','epic',89),
('card-090','horizons','epic',90),
('card-091','horizons','epic',91),
('card-092','horizons','epic',92),
('card-093','horizons','epic',93),
('card-094','horizons','epic',94),
('card-095','horizons','legendary',95),
('card-096','horizons','legendary',96),
('card-097','horizons','legendary',97),
('card-098','horizons','gold',98),
('card-099','horizons','gold',99),
('card-100','horizons','diamond',100);
create table cards_private.shop_catalog(id text primary key, kind text not null, amount integer not null, price integer not null);
insert into cards_private.shop_catalog values
 ('credits-100','credits',100,0),('credits-500','credits',500,0),('credits-1000','credits',1000,0),('credits-10000','credits',10000,0),('credits-50000','credits',50000,0),
 ('boosters-1','boosters',1,100),('boosters-5','boosters',5,500),('boosters-10','boosters',10,1000),('boosters-100','boosters',100,10000),('boosters-500','boosters',500,50000),
 ('custom-avatar','cosmetic',1,100),('frame-flowers','cosmetic',1,500),('frame-gold','cosmetic',1,1000),('frame-shiny','cosmetic',1,10000),('theme-blue','cosmetic',1,1000),('theme-red','cosmetic',1,1000);

alter table public.profiles enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.cards_saves enable row level security;
alter table cards_private.operations enable row level security;
alter table cards_private.card_catalog enable row level security;
alter table cards_private.shop_catalog enable row level security;
revoke all on public.profiles,public.user_cosmetics,public.cards_saves from public,anon,authenticated;
grant select on public.profiles,public.user_cosmetics,public.cards_saves to authenticated;
create policy own_profile on public.profiles for select to authenticated using ((select auth.uid())=user_id);
create policy own_cosmetics on public.user_cosmetics for select to authenticated using ((select auth.uid())=user_id);
create policy own_cards on public.cards_saves for select to authenticated using ((select auth.uid())=user_id);

create function cards_private.empty_save() returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('schemaVersion',1,'boosters',jsonb_build_object('available',10,'updatedAt',floor(extract(epoch from now())*1000)),'collection','{}'::jsonb,'stats',jsonb_build_object('boostersOpened',0,'goldPacksOpened',0,'bestRarity',null,'copiesByRarity','{"common":0,"rare":0,"epic":0,"legendary":0,"gold":0,"diamond":0}'::jsonb),'finalizedOpenIds','[]'::jsonb,'activeOpen',null);
$$;
create function cards_private.ensure_player() returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.profiles(user_id) values(uid) on conflict do nothing;
 insert into public.cards_saves(user_id,data) values(uid,cards_private.empty_save()) on conflict do nothing;
 return uid;
end; $$;
create function cards_private.snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; p public.profiles; s public.cards_saves; hours integer; begin
 uid:=cards_private.ensure_player();
 select * into p from public.profiles where user_id=uid for update;
 hours:=greatest(0,floor(extract(epoch from (now()-p.free_refill_at))/3600)::integer);
 if p.free_boosters=10 then
  update public.profiles set free_refill_at=now() where user_id=uid returning * into p;
 elsif hours>0 then
  update public.profiles set free_boosters=least(10,free_boosters+hours),free_refill_at=case when free_boosters+hours>=10 then now() else free_refill_at+hours*interval '1 hour' end where user_id=uid returning * into p;
 end if;
 select * into s from public.cards_saves where user_id=uid;
 return jsonb_build_object('profile',to_jsonb(p),'save',s.data||jsonb_build_object('boosters',jsonb_build_object('available',p.free_boosters,'updatedAt',floor(extract(epoch from p.free_refill_at)*1000)),'purchasedBoosters',p.boosters_to_open),'cosmetics',coalesce((select jsonb_agg(cosmetic_id order by cosmetic_id) from public.user_cosmetics where user_id=uid),'[]'::jsonb),'saveRevision',s.revision,'lastPlayedAt',s.last_played_at);
end; $$;

create function cards_private.draw_pack(set_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare gold boolean:=random()<0.00005; chosen text; card_id text; cards jsonb:='[]'; roll double precision; slot integer; begin
 if set_key not in ('origins','horizons') then raise exception 'INVALID_COLLECTION'; end if;
 for slot in 0..4 loop
  if gold then chosen:='legendary';
  elsif slot<4 then chosen:='common';
  else
   roll:=random()*100;
   chosen:=case when roll<82.49 then 'rare' when roll<97.49 then 'epic' when roll<99.49 then 'legendary' when roll<99.99 then 'gold' else 'diamond' end;
  end if;
  select id into card_id from cards_private.card_catalog where set_id=set_key and rarity=chosen order by random() limit 1;
  if card_id is null then raise exception 'CATALOG_UNAVAILABLE'; end if;
  cards:=cards||jsonb_build_array(jsonb_build_object('cardId',card_id,'rarity',chosen,'slot',slot,'shiny',random()<0.00001));
 end loop;
 return jsonb_build_object('kind',case when gold then 'gold_pack' else 'standard' end,'cards',cards);
end; $$;

create function cards_private.finalize(data jsonb) returns jsonb language plpgsql set search_path='' as $$
declare o jsonb:=data->'activeOpen'; c jsonb:=coalesce(data->'collection','{}'); stats jsonb:=data->'stats'; drawn jsonb; entry jsonb; qty integer; shiny integer; id text; rarity text; best text:=stats->>'bestRarity'; n integer; gold integer:=0; now_ms bigint:=floor(extract(epoch from now())*1000); ranks text[]:=array['common','rare','epic','legendary','gold','diamond']; begin
 if o is null or o='null'::jsonb or coalesce((o->>'finalized')::boolean,false) then return data; end if;
 if coalesce((o->>'simulation')::boolean,false) then raise exception 'INVALID_OPENING'; end if;
 n:=jsonb_array_length(o->'cards');
 for drawn in select value from jsonb_array_elements(o->'cards') loop
  id:=drawn->>'cardId'; rarity:=drawn->>'rarity'; entry:=c->id;
  qty:=coalesce((entry->>'qty')::integer,0)+1;
  shiny:=coalesce((entry->>'shinyQty')::integer,0)+case when (drawn->>'shiny')::boolean then 1 else 0 end;
  c:=jsonb_set(c,array[id],jsonb_build_object('qty',qty,'shinyQty',shiny,'firstAcquiredAt',coalesce((entry->>'firstAcquiredAt')::bigint,now_ms),'lastAcquiredAt',now_ms));
  stats:=jsonb_set(stats,array['copiesByRarity',rarity],to_jsonb(coalesce((stats#>>array['copiesByRarity',rarity])::integer,0)+1));
  if best is null or array_position(ranks,rarity)>array_position(ranks,best) then best:=rarity; end if;
 end loop;
 if o ? 'batchKinds' then select count(*) into gold from jsonb_array_elements_text(o->'batchKinds') as k(value) where value='gold_pack'; else gold:=case when o->>'kind'='gold_pack' then 1 else 0 end; end if;
 stats:=stats||jsonb_build_object('boostersOpened',(stats->>'boostersOpened')::integer+n/5,'goldPacksOpened',(stats->>'goldPacksOpened')::integer+gold,'bestRarity',best);
 o:=o||jsonb_build_object('phase','summary','finalized',true,'currentIndex',n,'revealed',(select jsonb_agg(true) from generate_series(1,n)));
 return data||jsonb_build_object('collection',c,'stats',stats,'activeOpen',o,'finalizedOpenIds',jsonb_build_array(o->>'openId'));
end; $$;

create function cards_private.dispatch(op text,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if quantity not in (1,10) then raise exception 'INVALID_QUANTITY'; end if;
  if p.free_boosters::bigint+p.boosters_to_open::bigint<quantity then raise exception 'INSUFFICIENT_BOOSTERS'; end if;
  free_used:=least(quantity,p.free_boosters);
  update public.profiles set free_boosters=free_boosters-free_used,boosters_to_open=boosters_to_open-(quantity-free_used) where user_id=uid;
  for i in 1..quantity loop pack:=cards_private.draw_pack(payload->>'setId'); cards:=cards||(pack->'cards'); kinds:=kinds||jsonb_build_array(pack->>'kind'); end loop;
  o:=jsonb_build_object('openId',operation_id::text,'kind',kinds->>0,'cards',cards,'phase','cutting','revealed',(select jsonb_agg(false) from generate_series(1,quantity*5)),'discovered','[]'::jsonb,'currentIndex',0,'createdAt',floor(extract(epoch from now())*1000),'finalized',false);
  if quantity=10 then o:=o||jsonb_build_object('batchKinds',kinds); end if;
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

create function public.cards_state() returns jsonb language sql security invoker set search_path='' as $$ select cards_private.snapshot(); $$;
create function public.cards_action(action text,payload jsonb,request_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select cards_private.dispatch(action,payload,request_id); $$;
create function public.grant_credits(pack_id text,request_id uuid default gen_random_uuid()) returns jsonb language sql security invoker set search_path='' as $$ select cards_private.dispatch('grant_credits',jsonb_build_object('id',pack_id),request_id); $$;
create function public.buy_boosters(pack_id text,request_id uuid default gen_random_uuid()) returns jsonb language sql security invoker set search_path='' as $$ select cards_private.dispatch('buy_boosters',jsonb_build_object('id',pack_id),request_id); $$;
create function public.buy_cosmetic(cosmetic_id text,request_id uuid default gen_random_uuid()) returns jsonb language sql security invoker set search_path='' as $$ select cards_private.dispatch('buy_cosmetic',jsonb_build_object('id',cosmetic_id),request_id); $$;
create function public.consume_booster(collection_id text default 'origins',quantity integer default 1,request_id uuid default gen_random_uuid()) returns jsonb language sql security invoker set search_path='' as $$ select cards_private.dispatch('consume_booster',jsonb_build_object('setId',collection_id,'quantity',quantity),request_id); $$;

-- UUID mapping for existing Google saves; no economic values originate in client snapshots.
insert into public.profiles(user_id,free_boosters,free_refill_at)
select u.id,least(10,greatest(0,(p.data#>>'{boosters,available}')::integer)),to_timestamp((p.data#>>'{boosters,updatedAt}')::double precision/1000)
from auth.users u join public.cards_progress p on p.owner=encode(sha256(convert_to('google:'||u.id::text,'UTF8')),'hex') on conflict do nothing;
insert into public.cards_saves(user_id,data,revision,last_played_at,legacy_imported)
select u.id,p.data,p.revision,p.updated_at,true from auth.users u join public.cards_progress p on p.owner=encode(sha256(convert_to('google:'||u.id::text,'UTF8')),'hex') on conflict do nothing;

revoke all on all functions in schema cards_private from public,anon,authenticated;
grant execute on function cards_private.snapshot(), cards_private.dispatch(text,jsonb,uuid) to authenticated;
revoke all on function public.cards_state(),public.cards_action(text,jsonb,uuid),public.grant_credits(text,uuid),public.buy_boosters(text,uuid),public.buy_cosmetic(text,uuid),public.consume_booster(text,integer,uuid) from public,anon;
grant execute on function public.cards_state(),public.cards_action(text,jsonb,uuid),public.grant_credits(text,uuid),public.buy_boosters(text,uuid),public.buy_cosmetic(text,uuid),public.consume_booster(text,integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
