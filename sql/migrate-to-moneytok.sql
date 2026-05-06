-- MoneyTok: migra landing_config existente do FootPriv pro MoneyTok
-- Útil se você já tem o banco rodando do projeto antigo e quer resetar
-- pro tema TikTok sem apagar nada além da config visual.
--
-- Se for começar do zero: PULA esse arquivo. Os defaults do código já
-- vão popular tudo certo na primeira leitura.

UPDATE public.landing_config
SET data = data
  || '{
    "logo_primary": "MONEY",
    "logo_secondary": "TOK",
    "tagline": "IA · Análise · Monetização",
    "headline": "A IA que transforma seus vídeos do TikTok em renda real",
    "headline_html": "A IA que transforma seus <strong>vídeos do TikTok</strong> em <span style=\"color:#25F4EE\">renda real</span>",
    "cta_text": "Localizar meu perfil",
    "color_primary": "#FE2C55",
    "color_accent": "#25F4EE",
    "color_bg_from": "#161823",
    "color_bg_via": "#010101",
    "color_bg_to": "#000000"
  }'::jsonb
WHERE id = 'main';

-- Reseta labels do dashboard pra contexto MoneyTok
UPDATE public.landing_config
SET data = jsonb_set(
  data,
  '{dashboard}',
  COALESCE(data->'dashboard', '{}'::jsonb) || '{
    "label_feed": "Meus Vídeos",
    "label_auction": "Análise IA",
    "label_my_auction": "Análise IA",
    "label_active_auction": "Em análise",
    "label_closed_auctions": "Analisados",
    "label_buyers_online": "Creators online",
    "label_recent_sales": "Análises recentes",
    "show_auction_tab": false
  }'::jsonb
)
WHERE id = 'main';
