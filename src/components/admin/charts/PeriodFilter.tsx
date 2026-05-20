'use client';

export type ChartPeriod = '7d' | '14d' | '30d' | '3m' | '6m' | 'custom';

interface Props {
  period: ChartPeriod;
  customFrom: string;
  customTo: string;
  showCustom: boolean;
  onChange: (p: ChartPeriod) => void;
  onCustomFrom: (v: string) => void;
  onCustomTo:   (v: string) => void;
}

const LABELS: Record<ChartPeriod, string> = {
  '7d':'7H', '14d':'14H', '30d':'30H', '3m':'3Bln', '6m':'6Bln', 'custom':'Custom',
};

const inputClass = "text-xs border border-[#52B788]/20 rounded-lg px-2 py-1 bg-[#0D1F16] text-white focus:outline-none focus:border-[#52B788]/50 transition-colors";

export function PeriodFilter({ period, customFrom, customTo, showCustom, onChange, onCustomFrom, onCustomTo }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#74C69D]/40 font-medium">Periode:</span>
      <div className="flex gap-1 flex-wrap">
        {(Object.keys(LABELS) as ChartPeriod[]).map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              period === p
                ? 'bg-[#40916C] border-[#40916C] text-white'
                : 'border-[#52B788]/20 text-[#74C69D]/50 hover:text-[#74C69D] hover:border-[#52B788]/40 hover:bg-[#52B788]/5'
            }`}>
            {LABELS[p]}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <input type="date" value={customFrom} max={customTo}
            onChange={e => onCustomFrom(e.target.value)} className={inputClass}/>
          <span className="text-[#74C69D]/30 text-xs">–</span>
          <input type="date" value={customTo} min={customFrom} max={today}
            onChange={e => onCustomTo(e.target.value)} className={inputClass}/>
        </div>
      )}
    </div>
  );
}
