alter table public.gift_items
  add column comment text
  constraint gift_items_comment_check
  check (char_length(comment) between 1 and 200 and comment !~ E'[\\r\\n]');

create or replace function public.gift_read_public(p_slug text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'title', l.title, 'description', l.description, 'slug', l.slug,
    'occasion_type', l.occasion_type, 'payment_info', l.payment_info,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'title', i.title, 'comment', i.comment, 'url', i.url, 'image_url', i.image_url,
      'price', i.price, 'is_group_gift', i.is_group_gift, 'priority', i.priority,
      'reserved', exists (select 1 from public.gift_reservations r where r.item_id = i.id and r.cancelled_at is null),
      'amount_contributed', (select coalesce(sum(r.amount_contributed),0) from public.gift_reservations r where r.item_id = i.id and r.cancelled_at is null),
      'guest_names', (select coalesce(jsonb_agg(r.guest_name order by r.created_at, r.id),'[]'::jsonb)
        from public.gift_reservations r where r.item_id = i.id and r.cancelled_at is null)
    ) order by i.created_at, i.id) from public.gift_items i where i.list_id = l.id), '[]'::jsonb)
  ) from public.gift_lists l where l.slug = p_slug;
$$;
