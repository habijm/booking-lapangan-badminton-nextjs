'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Email atau password salah. Silakan coba lagi.');
      setLoading(false);
      return;
    }

    router.push('/admin/dashboard');
  };

  return (
    <div className="min-h-screen court-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-court-green flex items-center justify-center shadow-court mx-auto mb-4">
            <span className="text-3xl">🏸</span>
          </div>
          <h1 className="text-2xl font-bold text-court-charcoal font-display">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Masuk untuk mengelola booking lapangan</p>
        </div>

        {/* Login form */}
        <div className="booking-card p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">Email Admin</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-fade-up">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Memproses...
                </>
              ) : (
                <>Masuk ke Dashboard</>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a href="/" className="text-sm text-court-green hover:underline">
              ← Kembali ke halaman utama
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Hanya untuk admin lapangan. Akses customer di halaman utama.
        </p>
      </div>
    </div>
  );
}
