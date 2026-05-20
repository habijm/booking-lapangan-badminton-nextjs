-- ============================================================
-- FIX: Tambah tabel ke realtime publication dengan aman
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Tambah courts (jika belum ada)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'courts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE courts;
  END IF;
END $$;

-- Tambah settings (jika belum ada)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  END IF;
END $$;

-- Tambah bookings (jika belum ada)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;

-- Verifikasi hasil
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
