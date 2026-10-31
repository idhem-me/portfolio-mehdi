begin;
-- Local nickname profiles are no longer used by Tetris. Keep score history intact.
delete from public.tetris_profiles;
commit;
