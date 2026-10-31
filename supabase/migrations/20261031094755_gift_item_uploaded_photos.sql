alter table public.gift_items
  drop constraint gift_items_image_url_check;

alter table public.gift_items
  add constraint gift_items_image_url_check
  check (
    (
      char_length(image_url) <= 4096
      and image_url ~ '^https?://[^[:space:]]+$'
    )
    or (
      char_length(image_url) <= 250000
      and image_url ~ '^data:image/webp;base64,[A-Za-z0-9+/]+=*$'
    )
  );
