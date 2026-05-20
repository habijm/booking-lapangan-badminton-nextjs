'use client';

import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import ScheduleGrid from '@/components/ScheduleGrid';
import { CourtSettings } from '@/lib/config';

interface Props { settings: CourtSettings }

export default function PublicPage({ settings }: Props) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar — fixed, includes announcement banner */}
      <Navbar settings={settings} />

      {/* Hero — full screen dark section */}
      <HeroSection settings={settings} />

      {/* ── Jadwal Section ── */}
      <section id="jadwal" className="px-4 sm:px-6 lg:px-8 py-12 bg-court-cream">
        <div className="max-w-6xl mx-auto">

          {/* Section header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-court-green/10 border border-court-green/20 text-court-green text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-court-green animate-pulse-slow inline-block"/>
              Real-time · Auto-update
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-court-charcoal font-display">
              Jadwal Lapangan
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Pilih tanggal dan klik slot tersedia untuk langsung booking via WhatsApp
            </p>
          </div>

          <div className="booking-card p-5 sm:p-6">
            <ScheduleGrid settings={settings} />
          </div>
        </div>
      </section>

      {/* ── Cara Booking ── */}
      <section id="cara-booking" className="px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="booking-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-court-charcoal font-display mb-5 flex items-center gap-2">
              <span>ℹ️</span> Cara Booking Lapangan
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { step:'01', icon:'👀', title:'Cek Jadwal',
                  desc:'Pilih tanggal dan lihat slot yang masih tersedia (hijau = tersedia)' },
                { step:'02', icon:'💬', title:'Hubungi via WhatsApp',
                  desc:'Klik slot tersedia atau tombol WhatsApp untuk langsung chat dengan admin' },
                { step:'03', icon:'✅', title:'Konfirmasi Booking',
                  desc:'Admin konfirmasi dan slot otomatis tampil sebagai "Dikonfirmasi"' },
              ].map(item => (
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

            {/* Info dinamis dari settings */}
            <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <h3 className="font-bold text-amber-800 font-display text-sm mb-2">📋 Informasi Penyewaan</h3>
              <ul className="text-xs text-amber-700 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Jam operasional: <strong>{settings.opening_hour}:00 – {settings.closing_hour}:00 WIB</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Harga sewa: <strong>Rp {settings.price_per_hour.toLocaleString('id')}/jam</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Booking tersedia hingga <strong>{settings.booking_window_days} hari</strong> ke depan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>Pembatalan maksimal <strong>{settings.cancellation_window_hours} jam</strong> sebelum jadwal</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-[#0D1F16] px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#40916C] flex items-center justify-center">
              <span className="text-base">🏸</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white font-display">{settings.court_name}</div>
              <div className="text-xs text-[#74C69D]/60">Sistem Booking Online</div>
            </div>
          </div>
          <div className="text-xs text-[#74C69D]/50 text-center sm:text-right">
            <p>Buka setiap hari · {settings.opening_hour}:00 – {settings.closing_hour}:00 WIB</p>
            <p className="mt-1">
              <a href={`https://wa.me/${settings.whatsapp_number}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[#74C69D] hover:text-white transition-colors font-medium">
                WhatsApp Admin ↗
              </a>
              {settings.court_address && (
                <span className="ml-3 text-[#74C69D]/40">{settings.court_address}</span>
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
