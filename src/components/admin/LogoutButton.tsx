'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  className?: string;
  showLabel?: boolean;
}

export function LogoutButton({ className, showLabel = true }: Props) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = '/admin';
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className ?? `flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        text-[#74C69D]/50 hover:text-[#74C69D] text-xs transition-colors
        hover:bg-[#52B788]/10 disabled:opacity-50`}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-[#74C69D]/20 border-t-[#74C69D] rounded-full animate-spin"/>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
      )}
      {showLabel && <span className="hidden sm:inline">Logout</span>}
    </button>
  );
}
