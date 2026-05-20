'use client';

export function DonutChart({ confirmed, pending, cancelled }: {
  confirmed: number; pending: number; cancelled: number;
}) {
  const total = confirmed + pending + cancelled || 1;
  const r = 38; const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = [
    { value: confirmed, color: '#40916C', label: 'Confirmed' },
    { value: pending,   color: '#F59E0B', label: 'Pending'   },
    { value: cancelled, color: '#EF4444', label: 'Dibatalkan'},
  ].map(s => ({ ...s, dash: (s.value / total) * circ }));

  return (
    <div className="flex items-center gap-4">
      <svg width="92" height="92" viewBox="0 0 92 92" className="flex-shrink-0">
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="13"/>
        {segments.map((seg, i) => {
          const el = (
            <circle key={i} cx="46" cy="46" r={r} fill="none"
              stroke={seg.color} strokeWidth="13"
              strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 46 46)"/>
          );
          offset += seg.dash; return el;
        })}
        <text x="46" y="42" textAnchor="middle" fontSize="15" fontWeight="800" fill="white">
          {confirmed + pending}
        </text>
        <text x="46" y="56" textAnchor="middle" fontSize="9" fill="rgba(116,198,157,0.5)">aktif</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }}/>
            <span className="text-xs text-[#74C69D]/50 flex-1">{s.label}</span>
            <span className="text-xs font-bold text-white">{s.value}</span>
            <span className="text-[10px] text-[#74C69D]/30 w-8 text-right">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
