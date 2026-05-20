import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('settings').select('*').order('key');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body     = await request.json();
  const updates  = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }));
  const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
