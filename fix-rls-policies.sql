-- ============================================================
-- FIX RLS POLICIES - Jalankan di Supabase SQL Editor
-- ============================================================

-- Hapus semua policy lama yang conflict
DROP POLICY IF EXISTS "Public can view confirmed and pending bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can create pending bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can update bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Admin can view all bookings" ON bookings;

-- ============================================================
-- SELECT policies
-- ============================================================

-- 1. Public (anon): hanya lihat confirmed & pending
CREATE POLICY "anon_select_bookings"
  ON bookings FOR SELECT
  TO anon
  USING (status IN ('confirmed', 'pending'));

-- 2. Admin (authenticated): lihat semua termasuk cancelled
CREATE POLICY "auth_select_all_bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- INSERT policies
-- ============================================================

-- 3. Public (anon): hanya bisa insert dengan status 'pending'
CREATE POLICY "anon_insert_pending_bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');

-- 4. Admin (authenticated): bisa insert dengan status apapun (pending/confirmed)
CREATE POLICY "auth_insert_any_bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- UPDATE policies
-- ============================================================

-- 5. Admin saja yang bisa update
CREATE POLICY "auth_update_bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- DELETE policies
-- ============================================================

-- 6. Admin saja yang bisa delete
CREATE POLICY "auth_delete_bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (true);
