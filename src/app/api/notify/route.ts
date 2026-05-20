import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { notifyConfirmed, notifyCancelled } from '@/lib/whatsapp';
import { Booking } from '@/types/booking';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json() as { bookingId: string; type: 'confirmed'|'cancelled'; reason?: string };
  const { data: booking, error } = await supabase.from('bookings').select('*').eq('id', body.bookingId).single();
  if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  const { data: settings } = await supabase.from('settings').select('key,value');
  const map  = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]));
  if (map.fonnte_enabled !== 'true') return NextResponse.json({ skipped: true });
  const ok = body.type === 'confirmed'
    ? await notifyConfirmed(booking as Booking, map.court_name ?? 'GOR Badminton')
    : await notifyCancelled(booking as Booking, map.court_name ?? 'GOR Badminton', body.reason);
  return NextResponse.json({ success: ok });
}
