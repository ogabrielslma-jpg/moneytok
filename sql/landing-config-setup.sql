-- Cria tabela de config da landing (uma única linha, key=main)
-- Roda no SQL Editor do Supabase

create table if not exists public.landing_config (
  id text primary key default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Insere config inicial se não existir
insert into public.landing_config (id, data)
values ('main', '{
  "logo_primary": "FOOT",
  "logo_secondary": "FANS",
  "tagline": "Discreto · Anônimo · Lucrativo",
  "headline": "Mais de 43.730 compradores ativos aguardando sua foto agora",
  "cta_text": "Enviar aos compradores",
  "banner_top_text": "⚠ Simulação acadêmica — nada aqui é real",
  "banner_top_enabled": true,
  "color_primary": "#22c55e",
  "color_accent": "#a3e635",
  "color_bg_from": "#1a1a2e",
  "color_bg_via": "#0a0a0a",
  "color_bg_to": "#000000",
  "background_image_url": "",
  "faqs": [
    {"q": "Como funciona?", "a": "Você envia a foto do seu pé no formulário acima e recebe propostas de compra de algum dos nossos 43.730 usuários compradores. Tempo de venda estimado é de 2 até 15 minutos."},
    {"q": "Como eu vou receber o pagamento?", "a": "Dentro da plataforma você cadastra uma conta bancária e uma chave pix. Os pagamentos caem na conta dentro de 15 minutos após a venda."},
    {"q": "Regras da plataforma. Leia com atenção!", "a": "Os compradores querem exclusividade, ou seja, você vai receber uma vez por uma foto vendida. Para fazer mais de uma venda, é necessário enviar outra foto do seu pé!"},
    {"q": "Isso é real?", "a": "Não. Este é um projeto acadêmico fictício criado em 24 horas para um desafio universitário. Nenhum sheik existe, nenhuma transação acontece. É 100% simulação."}
  ]
}'::jsonb)
on conflict (id) do nothing;

-- RLS: leitura pública (landing precisa carregar pra todos), escrita só com service_role
alter table public.landing_config enable row level security;

drop policy if exists "Landing config is viewable by everyone" on public.landing_config;
create policy "Landing config is viewable by everyone"
  on public.landing_config for select
  using (true);

drop policy if exists "Landing config can be updated by anyone" on public.landing_config;
create policy "Landing config can be updated by anyone"
  on public.landing_config for update
  using (true);

drop policy if exists "Landing config can be inserted by anyone" on public.landing_config;
create policy "Landing config can be inserted by anyone"
  on public.landing_config for insert
  with check (true);
