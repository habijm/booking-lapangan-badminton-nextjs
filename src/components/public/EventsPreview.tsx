'use client';

import { format, parseISO, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { useEvents } from '@/hooks/useEvents';
import { BadmintonEvent, EVENT_CATEGORY_CONFIG, EVENT_STATUS_CONFIG } from '@/types/booking';

interface Props { waNumber: string }

function MiniEventCard({ event, waNumber }: { event: BadmintonEvent; waNumber: string }) {
  const cat      = EVENT_CATEGORY_CONFIG[event.category];
  const sta      = EVENT_STATUS_CONFIG[event.status];
  const start    = parseISO(event.start_date);
  const daysLeft = differenceInDays(start, new Date());
  const waLink   = `https://wa.me/${event.contact_wa || waNumber}?text=${encodeURIComponent(`Halo, saya ingin info event:\n\n🏸 *${event.title}*\n📅 ${format(start, 'EEEE, d MMMM yyyy', { locale: id })}`)}`;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all hover:border-[#52B788]/40 ${cat.border}`}
      style={{ background: 'rgba(255,255,255,0.03)' }}>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.border} ${cat.color}`}>
          {cat.icon} {cat.label}
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sta.bg} ${sta.border} ${sta.color}`}>
          <span className={`w-1 h-1 rounded-full ${sta.dot}`}/>{sta.label}
        </span>
        {event.status === 'upcoming' && daysLeft >= 0 && (
          <span className="text-[10px] text-[#74C69D]/40 ml-auto">
            {daysLeft === 0 ? 'Hari ini!' : daysLeft === 1 ? 'Besok' : `${daysLeft}h lagi`}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-bold text-white font-display text-sm leading-tight">{event.title}</h4>

      {/* Info row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#74C69D]/50">
        <span>📅 {format(start, 'd MMM yyyy', { locale: id })}</span>
        {event.prize_pool && <span className="text-yellow-400/70">🏆 {event.prize_pool}</span>}
        {event.entry_fee === 0 ? <span className="text-[#52B788]">🆓 Gratis</span> : <span>💰 Rp {event.entry_fee.toLocaleString('id')}</span>}
      </div>

      {/* CTA */}
      <a href={waLink} target="_blank" rel="noopener noreferrer"
        className="mt-auto flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#40916C]/20 hover:bg-[#40916C]/40 text-[#74C69D] text-xs font-bold border border-[#52B788]/20 transition-all">
        Info & Daftar →
      </a>
    </div>
  );
}

export function EventsPreview({ waNumber }: Props) {
  const { events, loading } = useEvents(true);

  const upcoming = events
    .filter(e => e.status === 'upcoming' || e.status === 'ongoing')
    .slice(0, 3);

  // Don't render section if no events
  if (!loading && upcoming.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🏆</span>
              <h2 className="font-bold text-white font-display text-lg sm:text-xl">Event & Turnamen</h2>
            </div>
            <p className="text-[#74C69D]/40 text-xs sm:text-sm">Pertandingan dan perlombaan yang akan datang</p>
          </div>
          <a href="/events"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#52B788]/20 text-[#74C69D]/60 hover:text-[#74C69D] hover:border-[#52B788]/40 text-xs font-semibold transition-all whitespace-nowrap">
            Lihat Semua →
          </a>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length: 3}).map((_, i) => (
              <div key={i} className="h-48 rounded-xl animate-pulse border border-[#52B788]/10"
                style={{ background: 'rgba(82,183,136,0.04)' }}/>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map(event => (
              <MiniEventCard key={event.id} event={event} waNumber={waNumber}/>
            ))}
          </div>
        )}

        {/* CTA jika ada lebih dari 3 */}
        {events.length > 3 && (
          <div className="mt-5 text-center">
            <a href="/events"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#52B788]/25 text-[#74C69D]/60 hover:text-[#74C69D] hover:border-[#52B788]/50 text-sm font-semibold transition-all">
              Lihat {events.length - 3} Event Lainnya →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
