-- Cria bucket público pra assets da landing (logos, banners, fundos)
-- Roda no SQL Editor do Supabase UMA VEZ

-- Cria o bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('landing-assets', 'landing-assets', true, 10485760) -- 10MB
on conflict (id) do update set public = true;

-- Permite leitura pública
drop policy if exists "Public read landing assets" on storage.objects;
create policy "Public read landing assets"
  on storage.objects for select
  using (bucket_id = 'landing-assets');

-- Permite upload por qualquer um (admin não tem login, mas é protegido por senha no front)
drop policy if exists "Public upload landing assets" on storage.objects;
create policy "Public upload landing assets"
  on storage.objects for insert
  with check (bucket_id = 'landing-assets');

-- Permite delete (caso queira substituir)
drop policy if exists "Public delete landing assets" on storage.objects;
create policy "Public delete landing assets"
  on storage.objects for delete
  using (bucket_id = 'landing-assets');
