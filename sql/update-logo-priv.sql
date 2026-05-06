-- Atualiza FANS → PRIV no logo_secondary do banco
-- Só atualiza se ainda estiver como "FANS" (default original)

update public.landing_config
set data = jsonb_set(
  jsonb_set(
    data,
    '{logo_secondary}',
    '"PRIV"'::jsonb
  ),
  '{dashboard,logo_secondary}',
  '"PRIV"'::jsonb
)
where id = 'main'
  and (data->>'logo_secondary' = 'FANS' OR data->'dashboard'->>'logo_secondary' = 'FANS');
