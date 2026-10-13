-- CMS images (PRD §8.10): hero / card photos for country and visa service pages.
-- Public bucket so pages can link images directly; only CMS editors may write.

alter table public.countries add column if not exists image_path text;
alter table public.visa_services add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cms-media', 'cms-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy cms_media_editor_insert on storage.objects for insert
  with check (bucket_id = 'cms-media' and public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy cms_media_editor_update on storage.objects for update
  using (bucket_id = 'cms-media' and public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
create policy cms_media_editor_delete on storage.objects for delete
  using (bucket_id = 'cms-media' and public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
-- Storage checks SELECT before delete/overwrite; public reads go through the public URL, not this policy.
create policy cms_media_editor_select on storage.objects for select
  using (bucket_id = 'cms-media' and public.has_role(array['super_admin', 'immigration_admin']::public.app_role[]));
