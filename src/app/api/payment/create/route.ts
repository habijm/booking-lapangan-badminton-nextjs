// src/app/api/payment/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSnapToken, generateOrderId, buildCallbackUrls } from '@/lib/midtrans';
import { CreateBookingPayload } from '@/types/payment';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function getSettings(supabase: ReturnType<typeof supabaseAdmin>) {
  const { data } = await supabase.from('settings').select('key, value');
  return Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
}

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin();

  try {
    const body: CreateBookingPayload = await req.json();
    const {
      customer_name, customer_phone, customer_email,
      booking_date, start_time, duration_hours,
      court_id, notes,
    } = body;

    // ── Validasi field wajib ────────────────────────────────────────────────
    if (!customer_name?.trim())  return NextResponse.json({ error: 'Nama wajib diisi' },           { status: 400 });
    if (!customer_phone?.trim()) return NextResponse.json({ error: 'Nomor HP wajib diisi' },       { status: 400 });
    if (!booking_date)           return NextResponse.json({ error: 'Tanggal wajib diisi' },        { status: 400 });
    if (!start_time)             return NextResponse.json({ error: 'Jam mulai wajib diisi' },      { status: 400 });
    if (!duration_hours || duration_hours < 1) return NextResponse.json({ error: 'Durasi tidak valid' }, { status: 400 });

    // ── Ambil settings ──────────────────────────────────────────────────────
    const map         = await getSettings(supabase);
    const openHour    = Number(map.opening_hour ?? 8);
    const closeHour   = Number(map.closing_hour ?? 22);
    const priceBase   = Number(map.price_per_hour ?? 30000);
    const courtName   = map.court_name ?? 'GOR Badminton';
    const expiryMins  = Number(map.payment_expiry_minutes ?? 60);
    const closedDates: string[] = (() => { try { return JSON.parse(map.closed_dates ?? '[]'); } catch { return []; } })();

    // ── Validasi tanggal tutup ──────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    if (booking_date < today)              return NextResponse.json({ error: 'Tanggal sudah lewat' }, { status: 400 });
    if (closedDates.includes(booking_date)) return NextResponse.json({ error: 'Lapangan tutup pada tanggal tersebut' }, { status: 400 });

    // ── Hitung jam mulai/selesai ────────────────────────────────────────────
    const startH = parseInt(start_time.split(':')[0]);
    const endH   = startH + duration_hours;
    if (startH < openHour || endH > closeHour) {
      return NextResponse.json({ error: `Jam booking di luar jam operasional (${openHour}:00–${closeHour}:00)` }, { status: 400 });
    }
    const end_time = `${endH.toString().padStart(2, '0')}:00`;

    // ── Cek harga lapangan ──────────────────────────────────────────────────
    let pricePerHour = priceBase;
    let finalCourtId = court_id ?? null;
    let finalCourtName = courtName;

    if (court_id) {
      const { data: court } = await supabase
        .from('courts').select('id, name, price_per_hour, is_active')
        .eq('id', court_id).single();
      if (!court || !court.is_active) return NextResponse.json({ error: 'Lapangan tidak tersedia' }, { status: 400 });
      pricePerHour   = court.price_per_hour;
      finalCourtName = court.name;
    }

    const amount = pricePerHour * duration_hours;

    // ── Cek konflik slot ────────────────────────────────────────────────────
    let conflictQ = supabase
      .from('bookings').select('id')
      .eq('booking_date', booking_date)
      .not('status', 'eq', 'cancelled')
      .not('payment_status', 'eq', 'expired')
      .not('payment_status', 'eq', 'failed')
      .lt('start_time', end_time)
      .gt('end_time', start_time);

    if (finalCourtId) conflictQ = conflictQ.eq('court_id', finalCourtId);

    const { data: conflicts } = await conflictQ;
    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'Slot waktu tersebut sudah terisi. Pilih jam lain.' }, { status: 409 });
    }

    // ── Buat booking di DB ──────────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        customer_name:   customer_name.trim(),
        customer_phone:  customer_phone.trim(),
        booking_date,
        start_time,
        end_time,
        duration_hours,
        notes:           notes?.trim() ?? null,
        court_id:        finalCourtId,
        status:          'pending',
        payment_status:  'unpaid',
        booking_source:  'direct',
        amount,
      })
      .select('id').single();

    if (bookingErr || !booking) {
      console.error('Booking insert error:', bookingErr);
      return NextResponse.json({ error: 'Gagal membuat booking' }, { status: 500 });
    }

    const bookingId = booking.id as string;
    const orderId   = generateOrderId(bookingId);

    // ── Buat Snap Token Midtrans ────────────────────────────────────────────
    let snapToken: string;
    let snapUrl: string;

    try {
      const snap = await createSnapToken({
        orderId,
        amount,
        customerName:  customer_name.trim(),
        customerPhone: customer_phone.trim(),
        customerEmail: customer_email,
        courtName:     finalCourtName,
        bookingDate:   booking_date,
        startTime:     start_time,
        endTime:       end_time,
        durationHours: duration_hours,
        expiryMinutes: expiryMins,
        callbackUrl:   buildCallbackUrls(BASE_URL, bookingId),
      });
      snapToken = snap.token;
      snapUrl   = snap.redirect_url;
    } catch (snapErr: unknown) {
      // Rollback: hapus booking yang baru dibuat
      await supabase.from('bookings').delete().eq('id', bookingId);
      console.error('Snap token error:', snapErr);
      const msg = snapErr instanceof Error ? snapErr.message : 'Unknown error';
      return NextResponse.json({ error: `Gagal membuat sesi pembayaran: ${msg}` }, { status: 502 });
    }

    // ── Simpan snap token & order_id ke booking ─────────────────────────────
    await supabase.from('bookings').update({
      payment_id:    orderId,
      snap_token:    snapToken,
      snap_url:      snapUrl,
      payment_status:'pending',
    }).eq('id', bookingId);

    // ── Hitung waktu kedaluwarsa ────────────────────────────────────────────
    const expiryTime = new Date(Date.now() + expiryMins * 60 * 1000).toISOString();

    return NextResponse.json({
      booking_id:  bookingId,
      order_id:    orderId,
      snap_token:  snapToken,
      snap_url:    snapUrl,
      amount,
      expiry_time: expiryTime,
    }, { status: 201 });

  } catch (err) {
    console.error('Payment create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
