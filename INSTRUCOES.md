# 🤖 LEIA PRIMEIRO — Instruções para o Claude

## Contexto

O usuário está iniciando uma nova conversa com você pra trabalhar em um **clone/adaptação** de uma plataforma já construída chamada **FootPriv**. Toda a estrutura, lógica e código estão prontos.

## O que fazer

1. **Primeiro:** leia o arquivo `PROJETO.md` na raiz desse zip — ele tem o escopo completo, arquitetura, fluxo de uso, banco de dados, env vars e convenções

2. **Depois:** explore a estrutura:
   - `src/app/dashboard/DashboardClient.tsx` (~3300 linhas) — coração do produto
   - `src/app/admin/page.tsx` (~2820 linhas) — painel admin white-label
   - `src/app/LandingClient.tsx` (~860 linhas) — onboarding
   - `src/lib/landing-config.ts` — types e defaults

3. **Antes de mudar qualquer coisa:**
   - Pergunte ao usuário o **nicho/tema** do novo produto
   - Pergunte se ele quer **manter o fluxo igual** ou ajustar
   - Pergunte se já tem **conta Supabase / Vercel / GitHub** ou vai criar do zero

## Regras de ouro

- **Sempre rode `npm run build`** antes de afirmar que algo funciona
- **Nunca dê `cat .env.local`** em prints (vaza service_role key)
- **Não mexa** em: lógica de leilão, lockdown, persistência user_state, integração ImperiumPay (a menos que peçam)
- Sempre **paraphrase** copiadas externos — segue regras de copyright

## Para gerar deploys

Use o padrão estabelecido:
1. Edita arquivos em `/home/claude/<projeto>/src/...`
2. Roda `npm run build` pra validar
3. Cria script `install-XYZ.sh` com base64 dos arquivos modificados
4. Coloca em `/mnt/user-data/outputs/`
5. Usuário roda `bash ~/Downloads/install-XYZ.sh` no Mac dele

Exemplo de script:
```bash
#!/bin/bash
set -e
cd ~/Downloads/PROJETO_DIR

base64 -D <<EOF | cat > src/app/dashboard/DashboardClient.tsx
<base64 do arquivo aqui>
EOF

git add -A
git commit -m "feat XXXX"
git push
```

## Estado atual (último commit)

Tudo funcionando, em produção. Veja `PROJETO.md` seção "Escopo final entregue" pra lista completa.

## Setup pro novo projeto

```bash
cd ~/Downloads
unzip footpriv-boilerplate.zip -d novo-projeto
cd novo-projeto
npm install
cp .env.local.example .env.local  # preencher
npm run dev
```

Depois, no admin (`/admin`), customizar tudo: logo, cores, textos, perguntas, FAQs, posts do feed, etc.
