-- MoneyTok: adiciona colunas TikTok ao profiles
-- Aplique no Supabase SQL Editor após os SQLs base do FootPriv

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tiktok_username TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_profile JSONB,
  ADD COLUMN IF NOT EXISTS tiktok_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_tiktok_username ON profiles(tiktok_username);

-- Trigger pra preencher automaticamente a partir do user_metadata na criação
-- (o LandingClient grava nos metadata; isso copia pra coluna do profiles)
CREATE OR REPLACE FUNCTION sync_tiktok_from_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'tiktok_username' THEN
    UPDATE profiles
    SET
      tiktok_username = NEW.raw_user_meta_data->>'tiktok_username',
      tiktok_profile = NEW.raw_user_meta_data->'tiktok_profile',
      tiktok_synced_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_tiktok_sync ON auth.users;
CREATE TRIGGER on_auth_user_tiktok_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_tiktok_from_metadata();
