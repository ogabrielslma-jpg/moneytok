-- Desliga o banner do topo (caso esteja ligado no banco)
update public.landing_config
set data = data || '{"banner_enabled": false}'::jsonb
where id = 'main';
