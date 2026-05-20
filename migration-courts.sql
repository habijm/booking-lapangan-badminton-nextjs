-- ============================================================
-- MIGRATION: Tambah tabel courts
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Buat tabel courts
CREATE TABLE IF NOT EXISTS courts (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  is_active      BOOLEAN DEFAULT true,
  price_per_hour INTEGER DEFAULT 30000,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 1 lapangan default
INSERT INTO courts (name, description, price_per_hour)
SELECT 'Lapangan Utama', 'Lapangan badminton standar', 30000
WHERE NOT EXISTS (SELECT 1 FROM courts LIMIT 1);

-- Tambah kolom court_id ke bookings (jika belum ada)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES courts(id) ON DELETE SET NULL;

-- Set court_id default untuk booking yang sudah ada
UPDATE bookings
SET court_id = (SELECT id FROM courts ORDER BY created_at LIMIT 1)
WHERE court_id IS NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_bookings_court ON bookings(court_id);

-- RLS courts
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_courts"   ON courts;
DROP POLICY IF EXISTS "auth_read_courts"   ON courts;
DROP POLICY IF EXISTS "auth_manage_courts" ON courts;

CREATE POLICY "anon_read_courts"   ON courts FOR SELECT TO anon          USING (is_active = true);
CREATE POLICY "auth_read_courts"   ON courts FOR SELECT TO authenticated  USING (true);
CREATE POLICY "auth_manage_courts" ON courts FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE courts;

-- ============================================================
-- SELESAI. Tabel courts sudah siap.
-- Jika ingin tambah lapangan lagi, gunakan halaman /admin/courts
-- ============================================================
