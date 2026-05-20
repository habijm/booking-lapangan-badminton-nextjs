-- ============================================================
-- BADMINTON COURT BOOKING SYSTEM - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- Booking time
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Duration in hours (1 or 2)
  duration_hours INTEGER NOT NULL CHECK (duration_hours IN (1, 2)),
  
  -- Status: pending (menunggu konfirmasi), confirmed (dikonfirmasi), cancelled (dibatalkan)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  
  -- Notes from customer
  notes TEXT,
  
  -- Admin notes
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE: admin_users
-- (Simple admin auth via Supabase Auth)
-- ============================================================
-- Uses Supabase Auth built-in, no extra table needed.
-- Create admin user via Supabase Auth Dashboard.

-- ============================================================
-- INDEX for fast date queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public can READ confirmed bookings (to see availability)
CREATE POLICY "Public can view confirmed and pending bookings"
  ON bookings FOR SELECT
  USING (status IN ('confirmed', 'pending'));

-- Public can INSERT new bookings (as pending)
CREATE POLICY "Anyone can create pending bookings"
  ON bookings FOR INSERT
  WITH CHECK (status = 'pending');

-- Only authenticated users (admin) can UPDATE bookings
CREATE POLICY "Admin can update bookings"
  ON bookings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can DELETE bookings
CREATE POLICY "Admin can delete bookings"
  ON bookings FOR DELETE
  USING (auth.role() = 'authenticated');

-- Admin can see ALL bookings including cancelled
CREATE POLICY "Admin can view all bookings"
  ON bookings FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- FUNCTION: auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SAMPLE DATA (optional, untuk testing)
-- ============================================================
-- INSERT INTO bookings (customer_name, customer_phone, booking_date, start_time, end_time, duration_hours, status)
-- VALUES 
--   ('Budi Santoso', '081234567890', CURRENT_DATE, '08:00', '09:00', 1, 'confirmed'),
--   ('Siti Rahayu', '082345678901', CURRENT_DATE, '10:00', '12:00', 2, 'confirmed'),
--   ('Ahmad Fauzi', '083456789012', CURRENT_DATE, '14:00', '15:00', 1, 'pending');
