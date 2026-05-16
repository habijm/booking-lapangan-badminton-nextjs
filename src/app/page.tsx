import Navbar from '@/components/Navbar';
import ScheduleGrid from '@/components/ScheduleGrid';

const courtName = process.env.NEXT_PUBLIC_COURT_NAME || 'GOR Badminton';
const courtAddress = process.env.NEXT_PUBLIC_COURT_ADDRESS || '';
const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6281234567890';

export default function HomePage() {
  return (
    <div className="min-h-screen court-bg">
      <Navbar />

      {/* Hero section */}
      <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div className="page-enter">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-court-green/10 border border-court-green/20 text-court-green text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-court-green animate-pulse-slow inline-block"></span>
                Buka 08:00 – 22:00 WIB
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-court-charcoal font-display leading-tight">
                Jadwal Lapangan
                <span className="text-court-green block sm:inline"> Badminton</span>
              </h1>
              {courtAddress && (
                <p className="text-gray-500 mt-2 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-court-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {courtAddress}
                </p>
              )}
            </div>
            <div className="shuttle-icon text-5xl hidden sm:block" aria-hidden="true">🏸</div>
          </div>
        </div>
      </section>

      {/* Schedule section */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="booking-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-court-charcoal font-display mb-5 flex items-center gap-2">
              <span>📅</span> Pilih Tanggal & Lihat Jadwal
            </h2>
            <ScheduleGrid waNumber={waNumber} />
          </div>
        </div>
      </section>

      {/* How to book section */}
      <section id="cara-booking" className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="booking-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-court-charcoal font-display mb-5 flex items-center gap-2">
              <span>ℹ️</span> Cara Booking Lapangan
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  step: '01',
                  icon: '👀',
                  title: 'Cek Jadwal',
                  desc: 'Pilih tanggal yang kamu inginkan dan lihat slot yang masih tersedia (warna hijau = tersedia)',
                },
                {
                  step: '02',
                  icon: '💬',
                  title: 'Hubungi via WhatsApp',
                  desc: 'Klik slot yang tersedia atau tombol WhatsApp untuk langsung menghubungi admin kami',
                },
                {
                  step: '03',
                  icon: '✅',
                  title: 'Konfirmasi Booking',
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
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Jam operasional: <strong>08:00 – 22:00 WIB</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Minimal sewa <strong>1 jam</strong>, dapat disambung hingga 2 jam</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Booking dikonfirmasi setelah pembayaran diterima</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Pembatalan maksimal <strong>2 jam sebelum</strong> jadwal bermain</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-4 sm:px-6 lg:px-8 py-6 mt-4">
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
