// src/app/api/admin/settings/booking-mode/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function GET() {
  try {
    const supabase = supabaseAdmin();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'booking_mode')
      .single();

    return NextResponse.json({ mode: data?.value ?? 'whatsapp' });
  } catch {
    return NextResponse.json({ mode: 'whatsapp' });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;

    if (!['whatsapp', 'direct'].includes(mode)) {
      return NextResponse.json({ error: 'Mode tidak valid' }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    await supabase
      .from('settings')
      .upsert({ key: 'booking_mode', value: mode }, { onConflict: 'key' });

    return NextResponse.json({ mode, updated: true });
  } catch (err) {
    console.error('[booking-mode PUT]', err);
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 });
  }
}
