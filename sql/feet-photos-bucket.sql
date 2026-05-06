-- Garante que bucket feet-photos existe e tem politicas corretas

-- Cria bucket se não existir
insert into storage.buckets (id, name, public, file_size_limit)
values ('feet-photos', 'feet-photos', true, 10485760) -- 10MB
on conflict (id) do update set public = true;

-- Leitura pública (qualquer um vê as fotos das vendedoras)
drop policy if exists "Public read feet photos" on storage.objects;
create policy "Public read feet photos"
  on storage.objects for select
  using (bucket_id = 'feet-photos');

-- Upload por qualquer um (signup faz upload antes da sessão estar 100% propagada)
drop policy if exists "Public upload feet photos" on storage.objects;
create policy "Public upload feet photos"
  on storage.objects for insert
  with check (bucket_id = 'feet-photos');

-- Update e delete (caso queira substituir)
drop policy if exists "Public update feet photos" on storage.objects;
create policy "Public update feet photos"
  on storage.objects for update
  using (bucket_id = 'feet-photos');

drop policy if exists "Public delete feet photos" on storage.objects;
create policy "Public delete feet photos"
  on storage.objects for delete
  using (bucket_id = 'feet-photos');
