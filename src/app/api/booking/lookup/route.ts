import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { format, subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone_last4 = searchParams.get('phone_last4')?.trim();

  if (!phone_last4 || !/^\d{4}$/.test(phone_last4)) {
    return NextResponse.json({ error: 'Masukkan 4 digit terakhir nomor HP yang valid' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const dateFrom = format(subDays(new Date(), 60), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('bookings')
    .select(`id, customer_name, booking_date, start_time, end_time,
      duration_hours, status, payment_status, payment_method,
      amount, paid_at, booking_source, snap_url, court:courts(id,name)`)
    .ilike('customer_phone', `%${phone_last4}`)
    .gte('booking_date', dateFrom)
    .order('booking_date', { ascending: false })
    .order('start_time',   { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });

  return NextResponse.json({ bookings: data ?? [], count: data?.length ?? 0 });
}
