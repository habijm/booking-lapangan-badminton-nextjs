'use client';

import { useState } from 'react';
import { BannerConfig } from '@/lib/config';

interface Props { banners: BannerConfig }

export function BannerInfo({ banners }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!banners.info_enabled || dismissed || !banners.info_text) return null;

  return (
    <div className="border-t border-[#52B788]/10 bg-[#0D2B1C]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#52B788] flex-shrink-0 text-sm">📌</span>
          <p className="text-xs text-[#A8D5BC]/70 leading-relaxed truncate sm:whitespace-normal">
            {banners.info_text}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-[#74C69D]/30 hover:text-[#74C69D]/60 transition-colors"
          aria-label="Tutup"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
