'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';
import { useUserRole } from '@/hooks/useUserRole';

interface Props {
  children: React.ReactNode;
  title?: string;
  courtName?: string;
  pendingCount?: number;
}

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: '📊' },
  { href: '/admin/courts',    label: 'Lapangan',   icon: '🏟️' },
  { href: '/admin/settings',  label: 'Pengaturan', icon: '⚙️' },
  { href: '/admin/roles',     label: 'Roles',      icon: '👥' },
];

export function AdminLayout({ children, courtName = 'GOR Badminton', pendingCount = 0 }: Props) {
  const pathname   = usePathname();
  const { can }    = useUserRole();

  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.href === '/admin/settings') return can('settings');
    if (item.href === '/admin/courts')   return can('courts');
    if (item.href === '/admin/roles')    return can('roles');
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: '#0D1F16' }}>

      {/* ── Top navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#52B788]/15"
        style={{ background: 'rgba(13,31,22,0.95)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#40916C] flex items-center justify-center group-hover:bg-[#52B788] transition-colors">
                <span className="text-sm">🏸</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-white font-bold text-sm font-display leading-tight">{courtName}</div>
                <div className="text-[#74C69D]/50 text-[10px]">Admin Panel</div>
              </div>
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse-slow">
                  {pendingCount}
                </span>
              )}
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {visibleNav.map(item => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[#40916C] text-white'
                        : 'text-[#74C69D]/70 hover:text-[#74C69D] hover:bg-[#52B788]/10'
                    }`}>
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right: back to site + logout */}
            <div className="flex items-center gap-2">
              <Link href="/" target="_blank"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#74C69D]/50 hover:text-[#74C69D] text-xs transition-colors hover:bg-[#52B788]/10">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Lihat Situs
              </Link>
              <LogoutButton className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#74C69D]/50 hover:text-[#74C69D] text-xs transition-colors hover:bg-[#52B788]/10 disabled:opacity-50"/>
            </div>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden border-t border-[#52B788]/10 flex">
          {visibleNav.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-all ${
                  active ? 'text-[#74C69D]' : 'text-[#74C69D]/40 hover:text-[#74C69D]/70'
                }`}>
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
                {active && <span className="w-1 h-1 rounded-full bg-[#74C69D] mt-0.5"/>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Page content ── */}
      {/* pt-14 for top nav, extra pt-10 on mobile for bottom tab bar */}
      <div className="pt-14 md:pt-14 pb-24 md:pb-8">
        {/* Mobile: extra space for bottom tab bar */}
        <div className="md:hidden h-10"/>
        {children}
      </div>
    </div>
  );
}
