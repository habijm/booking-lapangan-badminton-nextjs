'use client';

import { useState } from 'react';
import { BannerConfig } from '@/lib/config';
import { Icon } from '@/components/Icons';

interface Props { banners: BannerConfig }

export function BannerInfo({ banners }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!banners.info_enabled || dismissed || !banners.info_text) return null;

  return (
    <div className="border-t border-[#52B788]/10 bg-[#0D2B1C]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="pin" size={15} className="text-[#52B788] flex-shrink-0" />
          <p className="text-xs text-[#A8D5BC]/70 leading-relaxed truncate sm:whitespace-normal">
            {banners.info_text}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-[#74C69D]/30 hover:text-[#74C69D]/60 transition-colors"
          aria-label="Tutup"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}
