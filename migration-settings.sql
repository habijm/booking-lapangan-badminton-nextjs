-- ============================================================
-- MIGRATION: Tambah tabel settings (Prioritas #2)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Buat tabel settings
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  label      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert nilai default (sesuaikan dengan GOR Anda)
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

-- RLS: semua bisa baca, hanya authenticated (admin) yang bisa ubah
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_settings"    ON settings;
DROP POLICY IF EXISTS "auth_manage_settings"  ON settings;

CREATE POLICY "anon_read_settings"   ON settings FOR SELECT TO anon          USING (true);
CREATE POLICY "auth_read_settings"   ON settings FOR SELECT TO authenticated  USING (true);
CREATE POLICY "auth_manage_settings" ON settings FOR ALL    TO authenticated  USING (true) WITH CHECK (true);

-- Aktifkan realtime agar settings update langsung kelihatan
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- ============================================================
-- SELESAI.
-- Setelah ini:
-- 1. Ubah nilai di tabel settings sesuai GOR Anda
-- 2. Atau gunakan halaman /admin/settings untuk mengubahnya
-- ============================================================
