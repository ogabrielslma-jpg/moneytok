-- ============================================
-- FootPriv - Setup do banco de dados
-- Cole tudo isso no SQL Editor do Supabase e clica em Run
-- ============================================

-- Tabela de perfis (info pública dos vendedores)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  bio text default 'Discreet collector. Premium content only.',
  total_earnings numeric default 0,
  verified boolean default false,
  created_at timestamp with time zone default now()
);

-- Tabela de listings (fotos à venda)
create table if not exists public.listings (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  image_url text not null,
  starting_price numeric not null default 100,
  current_bid numeric not null default 100,
  bid_count integer not null default 0,
  rarity text not null default 'common',
  created_at timestamp with time zone default now()
);

-- Tabela de bids (lances dos sheiks fictícios)
create table if not exists public.bids (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  bidder_name text not null,
  bidder_avatar text,
  amount numeric not null,
  created_at timestamp with time zone default now()
);

-- ============================================
-- POLÍTICAS DE SEGURANÇA (Row Level Security)
-- ============================================

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.bids enable row level security;

-- Profiles: qualquer um lê, só o dono edita
create policy "Profiles são públicos" on public.profiles for select using (true);
create policy "Usuário cria seu próprio perfil" on public.profiles for insert with check (auth.uid() = id);
create policy "Usuário edita seu próprio perfil" on public.profiles for update using (auth.uid() = id);

-- Listings: qualquer um lê, só o dono cria/edita
create policy "Listings são públicos" on public.listings for select using (true);
create policy "Usuário cria seus próprios listings" on public.listings for insert with check (auth.uid() = seller_id);
create policy "Usuário edita seus próprios listings" on public.listings for update using (auth.uid() = seller_id);
create policy "Usuário deleta seus próprios listings" on public.listings for delete using (auth.uid() = seller_id);

-- Bids: qualquer um lê, qualquer um cria (são fakes mesmo)
create policy "Bids são públicos" on public.bids for select using (true);
create policy "Qualquer um cria bid" on public.bids for insert with check (true);

-- ============================================
-- TRIGGER: criar perfil automaticamente ao registrar
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- DADOS DE EXEMPLO (sheiks fictícios)
-- Estes não vão pro banco, são só pro frontend
-- ============================================

-- Pronto! Agora vai em Storage e cria um bucket público chamado "feet-photos"
