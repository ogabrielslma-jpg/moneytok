-- ============================================================
-- Garantir unicidade do username em profiles
-- ============================================================

-- Caso exista username duplicado (de testes antigos), revisa antes de rodar:
-- SELECT username, COUNT(*) FROM profiles WHERE username IS NOT NULL GROUP BY username HAVING COUNT(*) > 1;

-- Adiciona constraint UNIQUE (vai falhar se já tiver duplicados; nesse caso, edita os duplicados primeiro)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Index case-insensitive pra busca rápida
CREATE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON profiles (LOWER(username));

-- ============================================================
-- Permitir leitura pública do username (pra check de disponibilidade)
-- ============================================================

-- Profiles geralmente já tem RLS. Garantir policy de SELECT pra anon:
DROP POLICY IF EXISTS "Anyone can check username availability" ON profiles;
CREATE POLICY "Anyone can check username availability"
  ON profiles FOR SELECT
  USING (true);
