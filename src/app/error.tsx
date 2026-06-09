'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error('[Error]', error); }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0D1F16' }}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)' }}/>
      </div>
      <div className="relative z-10 text-center max-w-md w-full">
        <div className="w-20 h-20 rounded-2xl border flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-display mb-3">Terjadi Kesalahan</h2>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'rgba(116,198,157,0.6)' }}>
          Maaf, terjadi kesalahan saat memuat halaman. Ini mungkin disebabkan oleh koneksi
          atau masalah sementara di server.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-95 shadow-lg"
            style={{ background: '#40916C' }}>
            🔄 Coba Lagi
          </button>
          <a href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ border: '1px solid rgba(82,183,136,0.3)', color: 'rgba(116,198,157,0.8)' }}>
            🏠 Ke Beranda
          </a>
        </div>
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mt-6 p-4 rounded-xl text-left overflow-auto max-h-40"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-red-400 text-xs font-mono break-all">{error.message}</p>
          </div>
        )}
        <p className="mt-8 text-xs" style={{ color: 'rgba(116,198,157,0.3)' }}>
          Jika masalah berlanjut, hubungi admin via WhatsApp.
        </p>
      </div>
    </div>
  );
}
