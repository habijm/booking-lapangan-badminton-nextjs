import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_date, start_time, end_time, duration_hours, status, customer_name')
    .eq('booking_date', date)
    .in('status', ['confirmed', 'pending'])
    .order('start_time');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_name, customer_phone, booking_date, start_time, duration_hours, notes } = body;

    // Validate required fields
    if (!customer_name || !customer_phone || !booking_date || !start_time || !duration_hours) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
    }

    const startH = parseInt(start_time.split(':')[0]);
    const endH = startH + duration_hours;

    if (startH < 8 || endH > 22) {
      return NextResponse.json({ error: 'Jam booking di luar jam operasional (08:00–22:00)' }, { status: 400 });
    }

    const end_time = `${endH.toString().padStart(2, '0')}:00`;

    // Check conflict
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_date', booking_date)
      .neq('status', 'cancelled')
      .lt('start_time', end_time)
      .gt('end_time', start_time);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'Slot waktu tersebut sudah terisi' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        booking_date,
        start_time,
        end_time,
        duration_hours,
        notes: notes?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ booking: data, message: 'Booking berhasil dibuat, menunggu konfirmasi admin' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
