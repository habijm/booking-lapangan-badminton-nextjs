'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSettings } from '@/hooks/useSettings';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminSectionHeader, AdminButton } from '@/components/admin/AdminCard';
import { UserRole, ROLE_CONFIG } from '@/types/booking';

interface AdminUser { user_id: string; role: UserRole; email: string }

export default function RolesPage() {
  const { ready }                             = useAdminAuth();
  const router                                = useRouter();
  const { settings }                          = useSettings();
  const { can, userId, loading: roleLoading } = useUserRole();
  const [users, setUsers]                     = useState<AdminUser[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [email, setEmail]                     = useState('');
  const [role, setRole]                       = useState<UserRole>('operator');
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/roles');
    if (res.ok) {
      const json = await res.json();
      setUsers(json.users ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Auth guard — AFTER all hooks
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1F16' }}>
      <span className="inline-block w-8 h-8 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin"/>
    </div>
  );

  if (!roleLoading && !can('roles')) {
    return (
      <AdminLayout courtName={settings.court_name}>
        <div className="max-w-md mx-auto px-4 pt-20 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="font-bold text-white font-display text-xl mb-2">Hanya Super Admin</h2>
          <p className="text-[#74C69D]/60 text-sm">Halaman ini hanya bisa diakses oleh Super Admin.</p>
          <AdminButton onClick={() => router.push('/admin/dashboard')} className="mt-4">← Kembali</AdminButton>
        </div>
      </AdminLayout>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? 'Gagal menambah user'); return; }
    setSuccess(`Role ${ROLE_CONFIG[role].label} berhasil diberikan ke ${email}`);
    setEmail(''); fetchUsers();
  };

  const handleChangeRole = async (user: AdminUser, newRole: UserRole) => {
    if (user.user_id === userId && newRole !== 'superadmin') {
      if (!confirm('Anda akan mengubah role diri sendiri. Lanjutkan?')) return;
    }
    await fetch('/api/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.user_id, role: newRole }),
    });
    fetchUsers();
  };

  const handleRemove = async (user: AdminUser) => {
    if (user.user_id === userId) { alert('Tidak bisa menghapus role diri sendiri.'); return; }
    if (!confirm(`Cabut akses untuk ${user.email}?`)) return;
    await fetch('/api/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.user_id }),
    });
    fetchUsers();
  };

  const ROLE_DESCRIPTIONS = {
    operator:   'Konfirmasi & batalkan booking',
    admin:      'Operator + tambah/hapus booking, analytics',
    superadmin: 'Admin + settings, lapangan & roles',
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/30 focus:outline-none focus:border-[#52B788]/60 transition-all text-sm";
  const selectClass = "px-3 py-1.5 rounded-lg border border-[#52B788]/20 bg-[#0D1F16] text-white focus:outline-none focus:border-[#52B788]/60 text-xs transition-all";

  return (
    <AdminLayout courtName={settings.court_name}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white font-display">👥 Manajemen Role User</h1>
          <p className="text-[#74C69D]/50 text-sm mt-1">Kelola akses dan permission setiap admin</p>
        </div>

        {/* Role cards */}
        <div className="grid sm:grid-cols-3 gap-3">
          {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([r, cfg]) => (
            <div key={r} className="p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5">
              <div className={`font-bold text-sm font-display mb-1 ${cfg.color}`}>{cfg.label}</div>
              <div className="text-xs text-[#74C69D]/50 leading-relaxed">{ROLE_DESCRIPTIONS[r]}</div>
            </div>
          ))}
        </div>

        {/* Add user form */}
        <AdminCard>
          <AdminSectionHeader title="➕ Tambah / Update Role User"/>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className={`${inputClass} flex-1`} placeholder="email@example.com" required/>
            <select value={role} onChange={e => setRole(e.target.value as UserRole)}
              className={`${selectClass} sm:w-44`}>
              {(Object.keys(ROLE_CONFIG) as UserRole[]).map(r => (
                <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
              ))}
            </select>
            <AdminButton type="submit" variant="primary" disabled={saving} className="whitespace-nowrap">
              {saving ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Proses...</> : 'Tambah'}
            </AdminButton>
          </form>
          {error   && <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
          {success && <div className="mt-3 p-3 rounded-xl bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D] text-sm">✅ {success}</div>}
          <p className="text-xs text-[#74C69D]/30 mt-3">💡 User harus sudah terdaftar di Supabase Auth dan pernah login minimal 1 kali.</p>
        </AdminCard>

        {/* User list */}
        <AdminCard padding="none">
          <div className="px-5 py-4 border-b border-[#52B788]/10 flex items-center justify-between">
            <AdminSectionHeader title={`User Admin (${users.length})`}/>
            <AdminButton variant="ghost" onClick={fetchUsers} className="text-xs">↻ Refresh</AdminButton>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{background:'rgba(82,183,136,0.05)'}}/>
            ))}</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl mb-2">👤</div>
              <p className="text-[#74C69D]/40 text-sm">Belum ada user terdaftar.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#52B788]/10">
              {users.map(u => {
                const cfg = ROLE_CONFIG[u.role];
                const isMe = u.user_id === userId;
                return (
                  <div key={u.user_id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-[#40916C]/30 border border-[#52B788]/20 flex items-center justify-center text-[#74C69D] font-bold text-sm flex-shrink-0">
                      {u.email[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {u.email}
                        {isMe && <span className="ml-1.5 text-[10px] text-[#74C69D]/40">(Anda)</span>}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${cfg.bg} ${cfg.color}`} style={{ borderColor: 'rgba(116, 198, 157, 0.2)' }}>
                        {cfg.label}
                      </span>
                    </div>
                    <select value={u.role} onChange={e => handleChangeRole(u, e.target.value as UserRole)} className={selectClass}>
                      {(Object.keys(ROLE_CONFIG) as UserRole[]).map(r => (
                        <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                      ))}
                    </select>
                    {!isMe && (
                      <AdminButton variant="danger" className="p-1.5" title="Cabut akses"
                        onClick={() => handleRemove(u)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </AdminButton>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AdminCard>

        <div className="p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5 text-xs text-[#74C69D]/60 space-y-1">
          <p className="font-bold text-[#74C69D]">💡 Setup superadmin pertama kali?</p>
          <p>Jalankan SQL ini di Supabase SQL Editor:</p>
          <pre className="mt-2 p-3 rounded-lg text-[11px] text-[#74C69D]/80 overflow-x-auto border border-[#52B788]/10" style={{background:'rgba(0,0,0,0.3)'}}>
{`INSERT INTO user_roles (user_id, role)
VALUES ('<user-id-dari-auth>', 'superadmin')
ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';`}
          </pre>
        </div>
      </div>
    </AdminLayout>
  );
}
