'use client';

import { Booking } from '@/types/booking';

export type BookingFilter = 'upcoming' | 'all' | 'pending' | 'confirmed' | 'cancelled';

interface Props {
  allBookings: Booking[];
  today: string;
  filter: BookingFilter;
  search: string;
  onFilter: (f: BookingFilter) => void;
  onSearch: (s: string) => void;
}

export function BookingFilters({ allBookings, today, filter, search, onFilter, onSearch }: Props) {
  const counts = {
    upcoming:  allBookings.filter(b => b.booking_date >= today && b.status !== 'cancelled').length,
    all:       allBookings.length,
    pending:   allBookings.filter(b => b.status === 'pending').length,
    confirmed: allBookings.filter(b => b.status === 'confirmed').length,
    cancelled: allBookings.filter(b => b.status === 'cancelled').length,
  };

  const opts: { id: BookingFilter; label: string }[] = [
    { id: 'upcoming',  label: '📅 Mendatang' },
    { id: 'all',       label: '🗂 Semua'     },
    { id: 'pending',   label: '⏳ Pending'   },
    { id: 'confirmed', label: '✅ Confirmed' },
    { id: 'cancelled', label: '✕ Batal'     },
  ];

  return (
    <div className="rounded-2xl border border-[#52B788]/15 p-3"
      style={{ background: 'rgba(255,255,255,0.03)' }}>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
        {opts.map(opt => {
          const active = filter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onFilter(opt.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                active
                  ? 'bg-[#40916C] border-[#40916C] text-white shadow-lg shadow-[#40916C]/20'
                  : 'border-[#52B788]/20 text-[#74C69D]/60 hover:text-[#74C69D] hover:border-[#52B788]/40 hover:bg-[#52B788]/5'
              }`}
            >
              {opt.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                active ? 'bg-white/20 text-white' : 'bg-white/5 text-[#74C69D]/40'
              }`}>
                {counts[opt.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74C69D]/30 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Cari nama atau nomor HP..."
          className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white
            placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 focus:bg-[#52B788]/8 transition-all"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74C69D]/40 hover:text-[#74C69D] transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
