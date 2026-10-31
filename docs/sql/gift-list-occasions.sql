-- Complément additif : libellé libre pour « Autre occasion ».
-- Une colonne facultative ; aucune modification des lignes, policies ou permissions.
begin;
alter table public.gift_lists add column occasion_label text check (char_length(occasion_label) <= 80);
notify pgrst, 'reload schema';
commit;
