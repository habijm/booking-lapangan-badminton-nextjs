import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { verifyAdminSession, verifyCsrf, csrfErrorResponse } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminSession(request, ['admin', 'superadmin']);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const supabase = createAdminClient();

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (roles ?? []).map(async (r) => {
      const { data } = await supabase.auth.admin.getUserById(r.user_id);
      return {
        user_id: r.user_id,
        role:    r.role,
        email:   data?.user?.email ?? r.user_id.slice(0, 8) + '...',
      };
    })
  );

  return NextResponse.json({ users: enriched });
}

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return csrfErrorResponse();
  }

  const authResult = await verifyAdminSession(request, ['superadmin']);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const supabase = createAdminClient();
  const { email, role } = await request.json();

  if (!email || !role) {
    return NextResponse.json({ error: 'email dan role wajib diisi' }, { status: 400 });
  }

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const user = list?.users?.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json(
      { error: `User dengan email "${email}" tidak ditemukan. Pastikan sudah login minimal sekali.` },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: user.id, role }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, user_id: user.id });
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminSession(request, ['superadmin']);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const supabase = createAdminClient();
  const { user_id, role } = await request.json();

  if (!user_id || !role) {
    return NextResponse.json({ error: 'user_id dan role wajib diisi' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id, role }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminSession(request, ['superadmin']);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const supabase = createAdminClient();
  const { user_id } = await request.json();

  if (!user_id) return NextResponse.json({ error: 'user_id wajib diisi' }, { status: 400 });

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
