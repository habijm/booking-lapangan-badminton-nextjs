'use client';

import { useState } from 'react';
import { BannerConfig } from '@/lib/config';

interface Props { banners: BannerConfig }

export function BannerSponsor({ banners }: Props) {
  const [imgError, setImgError] = useState(false);

  if (!banners.sponsor_enabled) return null;
  if (!banners.sponsor_image || imgError) return null;

  const content = (
    <div className="relative w-full max-w-6xl mx-auto rounded-2xl overflow-hidden border border-white/5 group">
      {/* Sponsor label */}
      <div className="absolute top-2 left-3 z-10">
        <span className="text-[10px] font-semibold text-white/40 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
          Iklan / Sponsor
        </span>
      </div>

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banners.sponsor_image}
        alt={banners.sponsor_title || 'Sponsor'}
        className="w-full h-auto max-h-[200px] sm:max-h-[260px] object-cover transition-transform duration-500 group-hover:scale-[1.01]"
        onError={() => setImgError(true)}
        loading="lazy"
      />

      {/* Hover overlay */}
      {banners.sponsor_url && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200"/>
      )}
    </div>
  );

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4">
      {banners.sponsor_url ? (
        <a href={banners.sponsor_url} target="_blank" rel="noopener noreferrer sponsored">
          {content}
        </a>
      ) : (
        content
      )}
    </section>
  );
}
