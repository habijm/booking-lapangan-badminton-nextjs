'use client';

import { useState } from 'react';

interface DataPoint { label: string; value: number; sublabel?: string }

export function BarChart({ data, maxVal, color = '#40916C' }: {
  data: DataPoint[]; maxVal: number; color?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex items-end gap-0.5 sm:gap-1 h-28 w-full relative">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 relative"
          onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>

          {/* Tooltip */}
          {hovered === i && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap shadow-lg pointer-events-none border border-[#52B788]/20"
              style={{ background: '#0D2B1C', color: '#74C69D' }}>
              {d.sublabel || d.label}: <strong className="text-white">{d.value}</strong>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                style={{ borderTopColor: '#0D2B1C' }}/>
            </div>
          )}

          <div className="w-full flex items-end justify-center" style={{ height: '96px' }}>
            <div
              className="w-full rounded-t-md transition-all duration-500 cursor-pointer"
              style={{
                height: maxVal > 0 ? `${Math.max(4, (d.value / maxVal) * 96)}px` : '4px',
                backgroundColor: d.value > 0
                  ? (hovered === i ? '#74C69D' : color)
                  : 'rgba(255,255,255,0.05)',
              }}
            />
          </div>
          <span className="text-[9px] text-[#74C69D]/30 truncate w-full text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
