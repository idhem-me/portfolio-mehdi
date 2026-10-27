begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',false,2097152,array['image/webp']) on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['image/webp'];
create policy cards_avatar_read on storage.objects for select to authenticated using(bucket_id='avatars' and name=(select auth.uid())::text||'/avatar.webp');
create policy cards_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and name=(select auth.uid())::text||'/avatar.webp' and exists(select 1 from public.user_cosmetics where user_id=(select auth.uid()) and cosmetic_id='custom-avatar'));
create policy cards_avatar_update on storage.objects for update to authenticated using(bucket_id='avatars' and name=(select auth.uid())::text||'/avatar.webp') with check(bucket_id='avatars' and name=(select auth.uid())::text||'/avatar.webp' and exists(select 1 from public.user_cosmetics where user_id=(select auth.uid()) and cosmetic_id='custom-avatar'));
create policy cards_avatar_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and name=(select auth.uid())::text||'/avatar.webp');
commit;
