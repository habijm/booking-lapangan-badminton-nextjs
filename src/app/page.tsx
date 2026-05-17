import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import ScheduleGrid from '@/components/ScheduleGrid';

const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6281234567890';
const courtName = process.env.NEXT_PUBLIC_COURT_NAME || 'GOR Badminton';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── 1. Eye-catching hero ── */}
      <HeroSection />

      {/* ── 2. Schedule section (anchored) ── */}
      <section id="jadwal" className="bg-[#F8F9F0] px-4 sm:px-6 lg:px-8 py-14">
        <div className="max-w-6xl mx-auto">

          {/* Section heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-court-green/10 border border-court-green/20 text-court-green text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-court-green animate-pulse-slow inline-block"></span>
                Real-time · Auto-update
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-court-charcoal font-display leading-tight">
                Jadwal <span className="text-court-green">Lapangan</span>
              </h2>
              <p className="text-gray-500 text-sm mt-1.5">Pilih tanggal dan pilih slot yang tersedia untuk booking via WhatsApp</p>
            </div>
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin booking lapangan badminton.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-shrink-0 py-2.5 px-5 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.847L0 24l6.337-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.366l-.36-.213-3.727.977.995-3.635-.234-.373A9.773 9.773 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
              </svg>
              Tanya Admin
            </a>
          </div>

          {/* Schedule card */}
          <div className="booking-card p-5 sm:p-6">
            <ScheduleGrid waNumber={waNumber} />
          </div>
        </div>
      </section>

      {/* ── 3. How to book ── */}
      <section id="cara-booking" className="bg-white px-4 sm:px-6 lg:px-8 py-14">
        <div className="max-w-6xl mx-auto">
          <div className="booking-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-court-charcoal font-display mb-5 flex items-center gap-2">
              <span>ℹ️</span> Cara Booking Lapangan
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  step: '01', icon: '👀', title: 'Cek Jadwal',
                  desc: 'Pilih tanggal yang kamu inginkan dan lihat slot yang masih tersedia (warna hijau = tersedia)',
                },
                {
                  step: '02', icon: '💬', title: 'Hubungi via WhatsApp',
                  desc: 'Klik slot yang tersedia atau tombol WhatsApp untuk langsung menghubungi admin kami',
                },
                {
                  step: '03', icon: '✅', title: 'Konfirmasi Booking',
                  desc: 'Admin akan mengkonfirmasi pesanan dan jadwal Anda akan tampil sebagai "Dikonfirmasi"',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 p-4 rounded-xl bg-court-cream border border-gray-100">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-court-green text-white flex items-center justify-center font-bold font-display text-sm shadow-court">
                      {item.step}
                    </div>
                  </div>
                  <div>
                    <div className="text-lg mb-1">{item.icon}</div>
                    <h3 className="font-bold text-court-charcoal font-display text-sm">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <h3 className="font-bold text-amber-800 font-display text-sm mb-2">📋 Informasi Penyewaan</h3>
              <ul className="text-xs text-amber-700 space-y-1.5">
                {[
                  'Jam operasional: **08:00 – 22:00 WIB**',
                  'Minimal sewa **1 jam**, dapat disambung hingga 2 jam',
                  'Booking dikonfirmasi setelah pembayaran diterima',
                  'Pembatalan maksimal **2 jam sebelum** jadwal bermain',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span dangerouslySetInnerHTML={{
                      __html: item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
                    }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-court-green flex items-center justify-center">
              <span className="text-sm">🏸</span>
            </div>
            <div>
              <div className="text-sm font-bold text-court-charcoal font-display">{courtName}</div>
              <div className="text-xs text-gray-400">Sistem Booking Online</div>
            </div>
          </div>
          <div className="text-xs text-gray-400 text-center sm:text-right">
            <p>Buka setiap hari • 08:00 – 22:00 WIB</p>
            <p className="mt-0.5">
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-court-green hover:underline font-medium"
              >
                WhatsApp Admin ↗
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
