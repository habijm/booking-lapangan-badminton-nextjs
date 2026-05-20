'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect     = searchParams.get('redirect') ?? '/admin/dashboard';
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) window.location.href = redirect;
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.session) {
      setError('Email atau password salah. Silakan coba lagi.');
      setLoading(false); return;
    }
    window.location.href = redirect;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#0D1F16' }}>

      {/* Background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(64,145,108,0.3) 0%, transparent 70%)' }}/>
        <div className="absolute -bottom-40 -right-20 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(116,198,157,0.12) 0%, transparent 70%)' }}/>
        {/* Court grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M60 0 L0 0 L0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#40916C] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#40916C]/30">
            <span className="text-3xl">🏸</span>
          </div>
          <h1 className="text-2xl font-bold text-white font-display">Admin Panel</h1>
          <p className="text-[#74C69D]/60 text-sm mt-1">Masuk untuk mengelola booking lapangan</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#52B788]/15 p-6 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#74C69D]/80 mb-1.5">
                Email Admin
              </label>
              <input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white
                  placeholder:text-[#74C69D]/30 focus:outline-none focus:border-[#52B788]/60 focus:bg-[#52B788]/10
                  transition-all text-sm disabled:opacity-50"
                placeholder="admin@example.com" required autoComplete="email" disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#74C69D]/80 mb-1.5">
                Password
              </label>
              <input
                id="password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white
                  placeholder:text-[#74C69D]/30 focus:outline-none focus:border-[#52B788]/60 focus:bg-[#52B788]/10
                  transition-all text-sm disabled:opacity-50"
                placeholder="••••••••" required autoComplete="current-password" disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm
                transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg shadow-[#40916C]/20 flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Memproses...</>
                : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a href="/" className="text-xs text-[#74C69D]/50 hover:text-[#74C69D] transition-colors">
              ← Kembali ke halaman publik
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-[#74C69D]/30 mt-4">
          Hanya untuk admin lapangan. Customer lihat jadwal di halaman utama.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1F16' }}>
        <span className="inline-block w-8 h-8 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin"/>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
