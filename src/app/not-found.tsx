import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0D1F16' }}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(64,145,108,0.2) 0%, transparent 70%)' }}/>
      </div>
      <div className="relative z-10 text-center max-w-md">
        <div className="text-9xl font-bold mb-2 select-none font-display"
          style={{ color: 'rgba(82,183,136,0.12)' }}>404</div>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto -mt-8 mb-6"
          style={{ background: 'rgba(64,145,108,0.15)', border: '1px solid rgba(82,183,136,0.2)' }}>
          <span className="text-3xl">🏸</span>
        </div>
        <h2 className="text-2xl font-bold text-white font-display mb-3">Halaman Tidak Ditemukan</h2>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'rgba(116,198,157,0.6)' }}>
          Halaman yang Anda cari tidak ada, sudah dipindahkan, atau URL-nya salah.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all active:scale-95 shadow-lg"
            style={{ background: '#40916C', boxShadow: '0 4px 20px rgba(64,145,108,0.25)' }}>
            🏠 Ke Beranda
          </Link>
          <Link href="/#jadwal"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ border: '1px solid rgba(82,183,136,0.3)', color: 'rgba(116,198,157,0.8)' }}>
            📅 Lihat Jadwal
          </Link>
        </div>
      </div>
    </div>
  );
}
