-- Tabela de assinaturas dos usuários (planos pagos)
-- Rastreia quem pagou qual plano e quando

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id text not null, -- 'starter', 'creator', 'super'
  amount_cents integer not null, -- valor pago em centavos (ex: 7900 = R$ 79)
  fee_pct numeric not null, -- taxa por venda (10, 8, 4)
  status text not null default 'pending', -- 'pending', 'paid', 'expired', 'cancelled'
  gateway_sale_id text, -- ID retornado pela ImperiumPay
  pix_qr_code text, -- QR Code base64
  pix_key text, -- chave copia-e-cola
  paid_at timestamptz,
  expires_at timestamptz, -- 1 ano a partir do paid_at
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pra buscar assinatura ativa do usuário
create index if not exists subs_user_status_idx on public.subscriptions(user_id, status);
create index if not exists subs_gateway_id_idx on public.subscriptions(gateway_sale_id);

-- RLS
alter table public.subscriptions enable row level security;

drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own subscriptions" on public.subscriptions;
create policy "Users insert own subscriptions"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

-- Service role pode atualizar (webhook)
drop policy if exists "Service updates subscriptions" on public.subscriptions;
create policy "Service updates subscriptions"
  on public.subscriptions for update
  using (true);
