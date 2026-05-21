'use client';

import { useState } from 'react';
import { BannerConfig, BannerType } from '@/lib/config';

interface Props {
  banners: BannerConfig;
  waNumber: string;
}

const TYPE_STYLES: Record<BannerType, {
  bg: string; border: string; icon: string;
  titleColor: string; bodyColor: string;
  btnBg: string; btnText: string;
  dismissColor: string;
}> = {
  promo: {
    bg:           'bg-gradient-to-r from-[#0D2B1C] to-[#0D1F16]',
    border:       'border-[#52B788]/30',
    icon:         '🎉',
    titleColor:   'text-white',
    bodyColor:    'text-[#A8D5BC]',
    btnBg:        'bg-[#40916C] hover:bg-[#52B788]',
    btnText:      'text-white',
    dismissColor: 'text-[#74C69D]/40 hover:text-[#74C69D]',
  },
  info: {
    bg:           'bg-gradient-to-r from-blue-950/80 to-blue-900/60',
    border:       'border-blue-500/30',
    icon:         'ℹ️',
    titleColor:   'text-white',
    bodyColor:    'text-blue-200',
    btnBg:        'bg-blue-600 hover:bg-blue-500',
    btnText:      'text-white',
    dismissColor: 'text-blue-400/40 hover:text-blue-300',
  },
  warning: {
    bg:           'bg-gradient-to-r from-amber-950/80 to-amber-900/50',
    border:       'border-amber-500/30',
    icon:         '⚠️',
    titleColor:   'text-white',
    bodyColor:    'text-amber-200',
    btnBg:        'bg-amber-500 hover:bg-amber-400',
    btnText:      'text-white',
    dismissColor: 'text-amber-400/40 hover:text-amber-300',
  },
  sponsor: {
    bg:           'bg-gradient-to-r from-purple-950/80 to-purple-900/50',
    border:       'border-purple-500/20',
    icon:         '✨',
    titleColor:   'text-white',
    bodyColor:    'text-purple-200',
    btnBg:        'bg-purple-600 hover:bg-purple-500',
    btnText:      'text-white',
    dismissColor: 'text-purple-400/40 hover:text-purple-300',
  },
};

export function BannerPromo({ banners, waNumber }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!banners.promo_enabled || dismissed) return null;
  if (!banners.promo_title && !banners.promo_body) return null;

  const s    = TYPE_STYLES[banners.promo_type];
  const href = banners.promo_cta_url
    ? banners.promo_cta_url
    : `https://wa.me/${waNumber}?text=${encodeURIComponent(banners.promo_title || 'Halo, saya ingin info promo.')}`;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-6xl mx-auto">
        <div className={`relative rounded-2xl border ${s.bg} ${s.border} p-5 sm:p-6 overflow-hidden`}>
          {/* Subtle bg glow */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(116,198,157,0.6) 0%, transparent 70%)' }}/>

          <div className="flex items-start gap-4 relative z-10">
            {/* Icon */}
            <span className="text-3xl flex-shrink-0 mt-0.5">{s.icon}</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {banners.promo_title && (
                <h3 className={`font-bold font-display text-base sm:text-lg leading-tight ${s.titleColor}`}>
                  {banners.promo_title}
                </h3>
              )}
              {banners.promo_body && (
                <p className={`text-sm mt-1 leading-relaxed ${s.bodyColor}`}>
                  {banners.promo_body}
                </p>
              )}
              {banners.promo_cta_text && (
                <a
                  href={href}
                  target={banners.promo_cta_url ? '_blank' : '_blank'}
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-xs font-bold
                    ${s.btnBg} ${s.btnText} transition-all duration-200 active:scale-95 shadow-lg`}
                >
                  {banners.promo_cta_text} →
                </a>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(true)}
              className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${s.dismissColor}`}
              aria-label="Tutup banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
