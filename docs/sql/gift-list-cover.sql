-- Image facultative, normalisée en WebP par le serveur.
-- Aucune permission ou policy modifiée.
begin;
alter table public.gift_lists add column cover_image text check (char_length(cover_image) <= 250000 and cover_image ~ '^data:image/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$');
notify pgrst, 'reload schema';
commit;
