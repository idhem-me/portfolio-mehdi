-- Étape 1 : exécuter UNE FOIS dans le SQL Editor du projet Supabase existant.
-- Les lectures invité et réservations passent par Next.js (clé serveur).
-- Aucun appel de ces fonctions n'est autorisé depuis le navigateur.
begin;

create table public.gift_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (char_length(description) <= 5000),
  -- 20 caractères hexadécimaux aléatoires, soit 80 bits, sans les bits fixes UUID.
  slug text not null unique default (
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  ) check (slug ~ '^[0-9a-f]{20}$'),
  occasion_type text not null default 'other'
    check (occasion_type in ('birth','birthday','christmas','wedding','other')),
  is_surprise_mode boolean not null default false,
  reservations_revealed_at timestamptz,
  payment_info text check (char_length(payment_info) <= 2000),
  created_at timestamptz not null default now()
);
create index gift_lists_owner_idx on public.gift_lists(user_id, created_at desc);

create table public.gift_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.gift_lists(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  url text check (char_length(url) <= 4096 and url ~ '^https?://[^[:space:]]+$'),
  image_url text check (char_length(image_url) <= 4096 and image_url ~ '^https?://[^[:space:]]+$'),
  price numeric(12,2) check (price >= 0 and price < 1000000000),
  is_group_gift boolean not null default false,
  priority text not null default 'normal' check (priority in ('normal','high')),
  created_at timestamptz not null default now(),
  constraint gift_group_requires_price check (not is_group_gift or (price is not null and price > 0))
);
create index gift_items_list_idx on public.gift_items(list_id, created_at);

create table public.gift_reservations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.gift_items(id) on delete cascade,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 120),
  guest_email text check (char_length(guest_email) <= 254),
  message text check (char_length(message) <= 2000),
  amount_contributed numeric(12,2),
  -- Copie du type lors de la réservation, pour l'index unique partiel.
  is_group_gift boolean not null,
  cancellation_token_hash text not null unique check (cancellation_token_hash ~ '^[0-9a-f]{64}$'),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint gift_reservation_amount check (
    (not is_group_gift and amount_contributed is null) or
    (is_group_gift and amount_contributed > 0 and amount_contributed < 1000000000 and amount_contributed is not null)
  )
);
create index gift_reservations_item_idx on public.gift_reservations(item_id);
create unique index gift_one_active_reservation_idx on public.gift_reservations(item_id)
  where not is_group_gift and cancelled_at is null;

alter table public.gift_lists enable row level security;
alter table public.gift_items enable row level security;
alter table public.gift_reservations enable row level security;
revoke all on public.gift_lists, public.gift_items, public.gift_reservations from public, anon, authenticated;
grant select, insert, delete on public.gift_lists, public.gift_items to authenticated;
grant update(title, description, occasion_type, is_surprise_mode, reservations_revealed_at, payment_info)
  on public.gift_lists to authenticated;
grant update(title, url, image_url, priority) on public.gift_items to authenticated;
-- Prix/type : modifications via le serveur uniquement (contrôle des réservations).
grant select, insert, update, delete on public.gift_lists, public.gift_items, public.gift_reservations to service_role;

create policy gift_lists_select_owner on public.gift_lists for select to authenticated
  using (user_id = (select auth.uid()));
create policy gift_lists_insert_owner on public.gift_lists for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy gift_lists_update_owner on public.gift_lists for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy gift_lists_delete_owner on public.gift_lists for delete to authenticated
  using (user_id = (select auth.uid()));
create policy gift_items_owner on public.gift_items for all to authenticated
  using (exists (select 1 from public.gift_lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.gift_lists l where l.id = list_id and l.user_id = (select auth.uid())));
-- Aucune policy sur gift_reservations : aucune lecture directe des données privées.

-- Fonctions invoker : aucune élévation de privilèges, search_path verrouillé.
create function public.gift_guard_item_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.list_id is distinct from old.list_id then
    raise exception 'gift_item_cannot_move' using errcode = '23514';
  end if;
  if (new.price is distinct from old.price or new.is_group_gift is distinct from old.is_group_gift)
    and exists (select 1 from public.gift_reservations where item_id = old.id and cancelled_at is null) then
    raise exception 'gift_item_has_reservations' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger gift_item_update_guard before update on public.gift_items
  for each row execute function public.gift_guard_item_update();

create function public.gift_read_public(p_slug text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'title', l.title, 'description', l.description, 'slug', l.slug,
    'occasion_type', l.occasion_type, 'payment_info', l.payment_info,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'title', i.title, 'url', i.url, 'image_url', i.image_url,
      'price', i.price, 'is_group_gift', i.is_group_gift, 'priority', i.priority,
      'reserved', exists (select 1 from public.gift_reservations r where r.item_id = i.id and r.cancelled_at is null),
      'amount_contributed', (select coalesce(sum(r.amount_contributed),0) from public.gift_reservations r where r.item_id = i.id and r.cancelled_at is null),
      'guest_names', (select coalesce(jsonb_agg(r.guest_name order by r.created_at, r.id),'[]'::jsonb)
        from public.gift_reservations r where r.item_id = i.id and r.cancelled_at is null)
    ) order by i.created_at, i.id) from public.gift_items i where i.list_id = l.id), '[]'::jsonb)
  ) from public.gift_lists l where l.slug = p_slug;
$$;

-- p_user_id vient exclusivement de auth.getUser() côté serveur, jamais du body client.
create function public.gift_read_owner_reservations(p_list_id uuid, p_user_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_list public.gift_lists;
begin
  select * into v_list from public.gift_lists where id = p_list_id and user_id = p_user_id;
  if not found then raise exception 'gift_list_not_found' using errcode = 'P0002'; end if;
  if v_list.is_surprise_mode and v_list.reservations_revealed_at is null then
    return jsonb_build_object('hidden', true);
  end if;
  return jsonb_build_object('hidden', false, 'reservations', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'item_id', r.item_id, 'guest_name', r.guest_name,
      'guest_email', r.guest_email, 'message', r.message,
      'amount_contributed', r.amount_contributed, 'created_at', r.created_at
    ) order by r.created_at, r.id)
    from public.gift_reservations r join public.gift_items i on i.id = r.item_id
    where i.list_id = p_list_id and r.cancelled_at is null
  ), '[]'::jsonb));
end $$;

-- Le serveur génère p_token avec crypto.randomBytes(32).toString('hex').
-- Garder le même token pour les nouvelles tentatives de la même soumission.
-- Seule son empreinte SHA-256 est conservée en base.
create function public.gift_reserve(
  p_slug text, p_item_id uuid, p_guest_name text, p_guest_email text,
  p_message text, p_amount numeric, p_token text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_item public.gift_items;
  v_existing public.gift_reservations;
  v_hash text;
  v_id uuid;
  v_total numeric;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'gift_invalid_token' using errcode = '22023';
  end if;
  if p_guest_name is null or char_length(btrim(p_guest_name)) not between 1 and 120 then
    raise exception 'gift_invalid_name' using errcode = '22023';
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  -- Verrou commun à toutes les participations, annulations et éditions d'un cadeau.
  select i.* into v_item from public.gift_items i join public.gift_lists l on l.id = i.list_id
    where i.id = p_item_id and l.slug = p_slug for update of i;
  if not found then raise exception 'gift_item_not_found' using errcode = 'P0002'; end if;

  select * into v_existing from public.gift_reservations where cancellation_token_hash = v_hash;
  if found then
    if v_existing.cancelled_at is not null then
      raise exception 'gift_reservation_cancelled' using errcode = '23514';
    end if;
    if v_existing.item_id is distinct from p_item_id
      or v_existing.guest_name is distinct from btrim(p_guest_name)
      or v_existing.guest_email is distinct from nullif(btrim(p_guest_email), '')
      or v_existing.message is distinct from nullif(btrim(p_message), '')
      or v_existing.amount_contributed is distinct from p_amount then
      raise exception 'gift_retry_mismatch' using errcode = '23514';
    end if;
    return v_existing.id;
  end if;
  if v_item.is_group_gift then
    if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity')
      or p_amount <= 0 or p_amount <> round(p_amount, 2) then
      raise exception 'gift_invalid_amount' using errcode = '22023';
    end if;
    select coalesce(sum(amount_contributed),0) into v_total from public.gift_reservations
      where item_id = p_item_id and cancelled_at is null;
    if v_total + p_amount > v_item.price then
      raise exception 'gift_amount_exceeds_remaining' using errcode = '23514';
    end if;
  else
    if p_amount is not null then raise exception 'gift_unexpected_amount' using errcode = '22023'; end if;
    if exists (select 1 from public.gift_reservations where item_id = p_item_id and cancelled_at is null) then
      raise exception 'gift_already_reserved' using errcode = '23505';
    end if;
  end if;
  insert into public.gift_reservations(item_id, guest_name, guest_email, message,
    amount_contributed, is_group_gift, cancellation_token_hash)
  values (p_item_id, btrim(p_guest_name), nullif(btrim(p_guest_email),''), nullif(btrim(p_message),''),
    p_amount, v_item.is_group_gift, v_hash) returning id into v_id;
  return v_id;
end $$;

create function public.gift_cancel(p_token text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_hash text; v_item_id uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select item_id into v_item_id from public.gift_reservations where cancellation_token_hash = v_hash;
  if not found then return false; end if;
  perform 1 from public.gift_items where id = v_item_id for update;
  update public.gift_reservations set cancelled_at = coalesce(cancelled_at, now())
    where cancellation_token_hash = v_hash;
  return found;
end $$;

revoke all on function public.gift_guard_item_update() from public, anon, authenticated;
revoke all on function public.gift_read_public(text) from public, anon, authenticated;
revoke all on function public.gift_read_owner_reservations(uuid,uuid) from public, anon, authenticated;
revoke all on function public.gift_reserve(text,uuid,text,text,text,numeric,text) from public, anon, authenticated;
revoke all on function public.gift_cancel(text) from public, anon, authenticated;
grant execute on function public.gift_guard_item_update() to service_role;
grant execute on function public.gift_read_public(text) to service_role;
grant execute on function public.gift_read_owner_reservations(uuid,uuid) to service_role;
grant execute on function public.gift_reserve(text,uuid,text,text,text,numeric,text) to service_role;
grant execute on function public.gift_cancel(text) to service_role;
commit;
