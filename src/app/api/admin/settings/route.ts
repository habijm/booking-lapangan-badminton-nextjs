import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BookingMode } from '@/types/payment';
import { verifyAdminSession } from '@/lib/auth-helpers';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET() {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from('settings').select('value').eq('key', 'booking_mode').single();
  return NextResponse.json({ mode: (data?.value ?? 'whatsapp') as BookingMode });
}

export async function PUT(req: NextRequest) {
  const authResult = await verifyAdminSession(req, ['admin', 'superadmin']);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const supabase = supabaseAdmin();

  try {
    const { mode } = await req.json();
    if (!['whatsapp', 'direct'].includes(mode)) {
      return NextResponse.json({ error: 'Mode tidak valid' }, { status: 400 });
    }

    await supabase.from('settings')
      .upsert({ key: 'booking_mode', value: mode }, { onConflict: 'key' });

    return NextResponse.json({ mode, updated: true });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 });
  }
}
