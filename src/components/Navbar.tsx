'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CourtSettings } from '@/lib/config';
import { Icon } from '@/components/Icons';

interface Props { settings: CourtSettings }

export default function Navbar({ settings }: Props) {
  const [menuOpen, setMenuOpen]         = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [dismissed, setDismissed]       = useState(false);

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

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-court-green flex items-center justify-center shadow-court group-hover:scale-105 transition-transform">
                <Icon name="court" size={18} className="text-white" />
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

            <div className="hidden md:flex items-center gap-6">
              <a href="/#jadwal"
                className={`text-sm font-medium transition-colors hover:text-court-green flex items-center gap-1.5 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                <Icon name="calendar" size={16} />
                Jadwal
              </a>
              <a href="/#cara-booking"
                className={`text-sm font-medium transition-colors hover:text-court-green flex items-center gap-1.5 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                <Icon name="info" size={16} />
                Cara Booking
              </a>
              <a href="/events"
                className={`text-sm font-medium transition-colors hover:text-court-green flex items-center gap-1.5 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                <Icon name="trophy" size={16} />
                Event
              </a>
              <a href="/memberships"
                className={`text-sm font-medium transition-colors hover:text-court-green flex items-center gap-1.5 ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                <Icon name="ticket" size={16} />
                Langganan
              </a>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                <Icon name="message" size={16} />
                WhatsApp
              </a>
            </div>

            <button onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-600 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
              aria-label="Toggle menu">
              <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>

          {menuOpen && (
            <div className={`md:hidden border-t py-3 space-y-1 animate-fade-up ${
              scrolled ? 'border-gray-100 bg-white' : 'border-white/10 bg-[#0D1F16]'
            }`}>
              <a href="/#jadwal" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-700 hover:bg-court-green-pale' : 'text-white/80 hover:bg-white/10'
                }`}>
                <Icon name="calendar" size={18} />
                Jadwal Lapangan
              </a>
              <a href="/#cara-booking" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-700 hover:bg-court-green-pale' : 'text-white/80 hover:bg-white/10'
                }`}>
                <Icon name="info" size={18} />
                Cara Booking
              </a>
              <a href="/events" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-700 hover:bg-court-green-pale' : 'text-white/80 hover:bg-white/10'
                }`}>
                <Icon name="trophy" size={18} />
                Event & Turnamen
              </a>
              <a href="/memberships" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  scrolled ? 'text-gray-700 hover:bg-court-green-pale' : 'text-white/80 hover:bg-white/10'
                }`}>
                <Icon name="ticket" size={18} />
                Paket Langganan
              </a>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 mx-4 px-4 py-2.5 text-sm font-medium text-white bg-court-green rounded-lg">
                <Icon name="message" size={18} />
                Hubungi via WhatsApp
              </a>
            </div>
          )}

          {showAnnouncement && (
            <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-xs font-medium">
              <Icon name="alertCircle" size={16} className="flex-shrink-0" />
              <span className="text-center leading-snug">{settings.announcement}</span>
              <button onClick={() => setDismissed(true)}
                className="flex-shrink-0 ml-2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label="Tutup pengumuman">
                <Icon name="close" size={14} />
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
