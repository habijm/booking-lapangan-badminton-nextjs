'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CourtSettings } from '@/lib/config';

interface Props { settings: CourtSettings }

export default function Navbar({ settings }: Props) {
  const [menuOpen, setMenuOpen]         = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [dismissed, setDismissed]       = useState(false);

  // Ubah style navbar saat scroll melewati hero
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showAnnouncement = !!settings.announcement && !dismissed;
  const waLink = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent('Halo, saya ingin booking lapangan badminton.')}`;

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-court-green flex items-center justify-center shadow-court group-hover:scale-105 transition-transform">
                <span className="text-lg">🏸</span>
              </div>
              <div className="hidden sm:block">
                <div className={`text-sm font-bold font-display leading-tight transition-colors ${scrolled ? 'text-court-charcoal' : 'text-white'}`}>
                  {settings.court_name}
                </div>
                <div className={`text-xs transition-colors ${scrolled ? 'text-gray-400' : 'text-white/60'}`}>
                  Buka {settings.opening_hour}:00 – {settings.closing_hour}:00
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="/#jadwal"
                className={`text-sm font-medium transition-colors hover:text-court-green ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                Jadwal
              </a>
              <a href="/#cara-booking"
                className={`text-sm font-medium transition-colors hover:text-court-green ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                Cara Booking
              </a>
              <a href="/events"
                className={`text-sm font-medium transition-colors hover:text-court-green ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                🏆 Event
              </a>
              <a href="/memberships"
                className={`text-sm font-medium transition-colors hover:text-court-green ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                🎫 Langganan
              </a>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="btn-primary py-2 px-4 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.847L0 24l6.337-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.366l-.36-.213-3.727.977.995-3.635-.234-.373A9.773 9.773 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
                </svg>
                WhatsApp
              </a>
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-600 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
              aria-label="Toggle menu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className={`md:hidden border-t py-3 space-y-1 animate-fade-up ${
              scrolled ? 'border-gray-100 bg-white' : 'border-white/10 bg-[#0D1F16]'
            }`}>
              <a href="/#jadwal" onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-700 hover:bg-court-green-pale' : 'text-white/80 hover:bg-white/10'
                }`}>
                📅 Jadwal Lapangan
              </a>
              <a href="/#cara-booking" onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-700 hover:bg-court-green-pale' : 'text-white/80 hover:bg-white/10'
                }`}>
                ℹ️ Cara Booking
              </a>
              <a href="/events" onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-700 hover:bg-court-green-pale' : 'text-white/80 hover:bg-white/10'
                }`}>
                🏆 Event & Turnamen
              </a>
              <a href="/memberships" onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-700 hover:bg-court-green-pale' : 'text-white/80 hover:bg-white/10'
                }`}>
                🎫 Paket Langganan
              </a>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 mx-4 px-4 py-2.5 text-sm font-medium text-white bg-court-green rounded-lg">
                💬 Hubungi via WhatsApp
              </a>
            </div>
          )}

          {/* Announcement banner */}
          {showAnnouncement && (
            <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-xs font-medium">
              <span className="flex-shrink-0">📢</span>
              <span className="text-center leading-snug">{settings.announcement}</span>
              <button onClick={() => setDismissed(true)}
                className="flex-shrink-0 ml-2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label="Tutup pengumuman">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer hanya untuk halaman non-hero (admin pages dll) */}
      {/* PublicPage tidak perlu spacer karena hero langsung di bawah transparent navbar */}
    </>
  );
}
