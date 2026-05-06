# FootPriv Boilerplate

Plataforma white-label de leilão de fotos.

## Stack
- Next.js 14 + TypeScript + Tailwind
- Supabase (Postgres + Auth + Storage)
- Vercel deploy
- ImperiumPay (PIX BR)

## Setup

```bash
npm install
cp .env.local.example .env.local
# Preencha com chaves Supabase + ImperiumPay
npm run dev
```

## Próximos passos

1. Criar projeto Supabase
2. Rodar SQLs em `/sql` na ordem (1-7) + criar `coupons` manual
3. Criar buckets `feet-photos` e `landing-assets` (PUBLIC)
4. Configurar env vars
5. Deploy Vercel
6. Acessar `/admin` com a senha do env pra customizar

📖 **Veja `PROJETO.md` pra escopo completo, arquitetura e fluxo de uso**.
