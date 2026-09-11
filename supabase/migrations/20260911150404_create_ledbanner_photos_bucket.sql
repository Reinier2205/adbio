-- Create public bucket for LED banner background photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ledbanner-photos',
  'ledbanner-photos',
  true,                          -- public: anyone with the URL can view
  5242880,                       -- 5 MB max per file
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Allow anonymous uploads (the Cloudflare Worker will use the service_role key,
-- but this policy covers the anon role as a fallback)
create policy "allow_anon_insert"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'ledbanner-photos');

-- Allow public read
create policy "allow_public_select"
  on storage.objects for select
  to anon
  using (bucket_id = 'ledbanner-photos');
