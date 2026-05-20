-- ================================================================
-- BADMINTON BOOKING SYSTEM — SAFE SCHEMA (aman dijalankan ulang)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. COURTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courts (
  id             UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT    NOT NULL,
  description    TEXT,
  is_active      BOOLEAN DEFAULT true,
  price_per_hour INTEGER DEFAULT 30000,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO courts (name, description, price_per_hour)
SELECT 'Lapangan Utama', 'Lapangan badminton standar', 30000
WHERE NOT EXISTS (SELECT 1 FROM courts LIMIT 1);

-- ── 2. BOOKINGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id             UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_name  TEXT    NOT NULL,
  customer_phone TEXT    NOT NULL,
  booking_date   DATE    NOT NULL,
  start_time     TIME    NOT NULL,
  end_time       TIME    NOT NULL,
  duration_hours INTEGER NOT NULL CHECK (duration_hours BETWEEN 1 AND 4),
  status         TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','cancelled')),
  notes          TEXT,
  admin_notes    TEXT,
  court_id       UUID    REFERENCES courts(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES courts(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;

UPDATE bookings
  SET court_id = (SELECT id FROM courts ORDER BY created_at LIMIT 1)
  WHERE court_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_date        ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_court       ON bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);

-- ── 3. SETTINGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  label      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value, label) VALUES
  ('court_name',               'GOR Badminton Sinar Jaya', 'Nama GOR / Lapangan'),
  ('court_address',            'Jl. Raya Badminton No. 1', 'Alamat'),
  ('whatsapp_number',          '6281234567890',            'Nomor WhatsApp Admin'),
  ('opening_hour',             '8',                        'Jam Buka (0-23)'),
  ('closing_hour',             '22',                       'Jam Tutup (0-23)'),
  ('price_per_hour',           '30000',                    'Harga per Jam (Rp)'),
  ('booking_window_days',      '14',                       'Maks Booking ke Depan (hari)'),
  ('cancellation_window_hours','2',                        'Batas Pembatalan (jam sebelum)'),
  ('announcement',             '',                         'Pengumuman Publik'),
  ('fonnte_enabled',           'false',                    'Notifikasi WA via Fonnte')
ON CONFLICT (key) DO NOTHING;

-- ── 4. USER ROLES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role       TEXT NOT NULL DEFAULT 'operator'
             CHECK (role IN ('operator','admin','superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. AUTO updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. RLS ───────────────────────────────────────────────────
ALTER TABLE bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE tablename IN ('bookings','courts','settings','user_roles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "anon_read_bookings"  ON bookings FOR SELECT TO anon          USING (status IN ('confirmed','pending'));
CREATE POLICY "anon_insert_booking" ON bookings FOR INSERT TO anon          WITH CHECK (status = 'pending');
CREATE POLICY "auth_read_bookings"  ON bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_booking" ON bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_booking" ON bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_booking" ON bookings FOR DELETE TO authenticated USING (true);

CREATE POLICY "anon_read_courts"   ON courts FOR SELECT TO anon          USING (is_active = true);
CREATE POLICY "auth_read_courts"   ON courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_courts" ON courts FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_settings"   ON settings FOR SELECT TO anon          USING (true);
CREATE POLICY "auth_read_settings"   ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_settings" ON settings FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_roles"   ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_roles" ON user_roles FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- ── 7. REALTIME (aman, skip jika sudah ada) ──────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'courts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE courts;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  END IF;
END $$;

-- ── Verifikasi ───────────────────────────────────────────────
SELECT 'Tables OK' AS status, count(*) AS jumlah FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('bookings','courts','settings','user_roles');
