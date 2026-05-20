import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// GET: list all users with roles
export async function GET() {
  const supabase = createAdminClient();

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with email from auth.users
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

// POST: add or update role for a user by email
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const { email, role } = await request.json();

  if (!email || !role) {
    return NextResponse.json({ error: 'email dan role wajib diisi' }, { status: 400 });
  }

  // Look up user by email via admin API
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

// PATCH: update role for existing user
export async function PATCH(request: NextRequest) {
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

// DELETE: remove role (revoke access)
export async function DELETE(request: NextRequest) {
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
