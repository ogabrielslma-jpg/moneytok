-- Tabela pra persistir estado do leilão/carteira por usuário
-- Sincroniza entre dispositivos

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS: cada usuário lê e escreve só o próprio estado
alter table public.user_state enable row level security;

drop policy if exists "Users read own state" on public.user_state;
create policy "Users read own state"
  on public.user_state for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own state" on public.user_state;
create policy "Users insert own state"
  on public.user_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own state" on public.user_state;
create policy "Users update own state"
  on public.user_state for update
  using (auth.uid() = user_id);
