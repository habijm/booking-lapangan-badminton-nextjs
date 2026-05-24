'use client';

import { useState } from 'react';
import { format, parseISO, isBefore, isAfter, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';
import Navbar from '@/components/Navbar';
import { CourtSettings } from '@/lib/config';
import { BadmintonEvent, EventCategory, EventStatus, EVENT_CATEGORY_CONFIG, EVENT_STATUS_CONFIG } from '@/types/booking';
import { useEvents } from '@/hooks/useEvents';

interface Props { settings: CourtSettings; initialEvents: BadmintonEvent[] }

function EventCard({ event, waNumber }: { event: BadmintonEvent; waNumber: string }) {
  const [expanded, setExpanded] = useState(false);
  const cat = EVENT_CATEGORY_CONFIG[event.category];
  const sta = EVENT_STATUS_CONFIG[event.status];
  const today = new Date();

  const startDate = parseISO(event.start_date);
  const endDate   = parseISO(event.end_date);
  const deadline  = event.registration_deadline ? parseISO(event.registration_deadline) : null;
  const daysLeft  = differenceInDays(startDate, today);
  const regClosed = deadline ? isBefore(deadline, today) : false;
  const isFull    = event.max_participants ? event.current_participants >= event.max_participants : false;

  const canRegister = event.status === 'upcoming' && !regClosed && !isFull;

  const waText = encodeURIComponent(
    `Halo, saya ingin mendaftar event:\n\n🏸 *${event.title}*\n📅 ${format(startDate, 'EEEE, d MMMM yyyy', { locale: id })}\n\nMohon info lebih lanjut.`
  );
  const waLink = `https://wa.me/${event.contact_wa || waNumber}?text=${waText}`;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
      event.status === 'cancelled' ? 'opacity-50' : ''
    } ${cat.border} bg-gradient-to-br from-[#0f2a1a] to-[#0D1F16]`}>

      {/* Image */}
      {event.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.image_url} alt={event.title}
          className="w-full h-40 sm:h-48 object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          loading="lazy"/>
      )}

      <div className="p-5">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cat.bg} ${cat.border} ${cat.color}`}>
            {cat.icon} {cat.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${sta.bg} ${sta.border} ${sta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sta.dot}`}/>
            {sta.label}
          </span>
          {event.status === 'upcoming' && daysLeft >= 0 && (
            <span className="text-[11px] text-[#74C69D]/50 ml-auto">
              {daysLeft === 0 ? 'Hari ini!' : daysLeft === 1 ? 'Besok' : `${daysLeft} hari lagi`}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-white font-display text-base sm:text-lg leading-tight mb-3">
          {event.title}
        </h3>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <InfoItem icon="📅" label="Tanggal">
            {format(startDate, 'd MMM', { locale: id })}
            {event.start_date !== event.end_date && ` – ${format(endDate, 'd MMM yyyy', { locale: id })}`}
            {event.start_date === event.end_date && ` ${format(startDate, 'yyyy', { locale: id })}`}
          </InfoItem>
          {event.start_time && (
            <InfoItem icon="⏰" label="Mulai">
              {event.start_time.slice(0,5)} WIB
            </InfoItem>
          )}
          {event.entry_fee > 0 && (
            <InfoItem icon="💰" label="Biaya Daftar">
              Rp {event.entry_fee.toLocaleString('id')}
            </InfoItem>
          )}
          {event.entry_fee === 0 && (
            <InfoItem icon="🆓" label="Biaya Daftar">
              <span className="text-[#52B788] font-bold">GRATIS</span>
            </InfoItem>
          )}
          {event.prize_pool && (
            <InfoItem icon="🏆" label="Total Hadiah">
              <span className="text-yellow-400 font-bold">{event.prize_pool}</span>
            </InfoItem>
          )}
          {event.max_participants && (
            <InfoItem icon="👥" label="Peserta">
              {event.current_participants}/{event.max_participants}
              {isFull && <span className="text-red-400 font-bold ml-1">(Penuh)</span>}
            </InfoItem>
          )}
          {deadline && (
            <InfoItem icon="⏳" label="Deadline Daftar">
              <span className={regClosed ? 'text-red-400' : 'text-amber-400'}>
                {format(deadline, 'd MMM yyyy', { locale: id })}
                {regClosed && ' (Ditutup)'}
              </span>
            </InfoItem>
          )}
        </div>

        {/* Description expandable */}
        {event.description && (
          <div className="mb-4">
            <p className={`text-xs text-[#A8D5BC]/60 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
              {event.description}
            </p>
            {event.description.length > 120 && (
              <button onClick={() => setExpanded(v => !v)}
                className="text-xs text-[#52B788] hover:text-[#74C69D] mt-1 transition-colors">
                {expanded ? 'Sembunyikan ↑' : 'Selengkapnya ↓'}
              </button>
            )}
          </div>
        )}

        {/* CTA */}
        {canRegister ? (
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-[#40916C]/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.847L0 24l6.337-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.366l-.36-.213-3.727.977.995-3.635-.234-.373A9.773 9.773 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
            </svg>
            Daftar via WhatsApp
          </a>
        ) : event.status === 'upcoming' ? (
          <div className={`text-center py-2.5 rounded-xl border text-xs font-bold ${
            isFull    ? 'border-red-500/30 bg-red-500/8 text-red-400' :
            regClosed ? 'border-white/10 bg-white/3 text-white/30'    :
                        'border-[#52B788]/20 bg-[#52B788]/5 text-[#74C69D]/50'
          }`}>
            {isFull ? '⛔ Pendaftaran Penuh' : regClosed ? '⏱️ Pendaftaran Ditutup' : 'Info via WhatsApp'}
          </div>
        ) : event.status === 'ongoing' ? (
          <div className="text-center py-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/8 text-yellow-400 text-xs font-bold">
            🏸 Sedang Berlangsung
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <div className="text-[10px] text-[#74C69D]/40 font-semibold uppercase tracking-wide">{label}</div>
        <div className="text-xs text-white font-medium leading-tight">{children}</div>
      </div>
    </div>
  );
}

export default function EventsPublicPage({ settings, initialEvents }: Props) {
  const { events, loading } = useEvents(true);
  const displayEvents = events.length > 0 ? events : initialEvents;

  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all');
  const [filterCat,    setFilterCat]    = useState<EventCategory | 'all'>('all');

  const filtered = displayEvents.filter(e => {
    const okStatus = filterStatus === 'all' || e.status === filterStatus;
    const okCat    = filterCat    === 'all' || e.category === filterCat;
    return okStatus && okCat;
  });

  const upcoming   = displayEvents.filter(e => e.status === 'upcoming').length;
  const ongoing    = displayEvents.filter(e => e.status === 'ongoing').length;

  return (
    <div className="min-h-screen" style={{ background: '#0D1F16' }}>
      <Navbar settings={settings}/>

      {/* Hero */}
      <section className="relative pt-20 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(64,145,108,0.5) 0%, transparent 70%)' }}/>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#52B788]/30 bg-[#52B788]/10 text-[#74C69D] text-xs font-semibold mb-4">
            <span className="text-base">🏆</span>
            Event & Turnamen
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-display leading-tight mb-3">
            Pertandingan &<br/>
            <span style={{ backgroundImage:'linear-gradient(135deg,#74C69D,#40916C)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Perlombaan
            </span>
          </h1>
          <p className="text-[#A8D5BC]/60 text-sm sm:text-base max-w-xl">
            Ikuti berbagai event badminton di {settings.court_name}. Dari turnamen kompetitif hingga pertandingan persahabatan.
          </p>

          {/* Quick stats */}
          {(upcoming > 0 || ongoing > 0) && (
            <div className="flex gap-4 mt-6">
              {ongoing > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"/>
                  <span className="text-yellow-400 text-sm font-bold">{ongoing} Sedang Berlangsung</span>
                </div>
              )}
              {upcoming > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#52B788]/30 bg-[#52B788]/10">
                  <span className="w-2 h-2 rounded-full bg-[#52B788] animate-pulse"/>
                  <span className="text-[#74C69D] text-sm font-bold">{upcoming} Akan Datang</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 sm:px-6 lg:px-8 pb-4">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {([
              { id:'all', label:'Semua Event' },
              { id:'upcoming',  label:'🟢 Akan Datang' },
              { id:'ongoing',   label:'🟡 Berlangsung' },
              { id:'completed', label:'⚫ Selesai'     },
            ] as { id: EventStatus|'all'; label: string }[]).map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filterStatus === f.id
                    ? 'bg-[#40916C] border-[#40916C] text-white'
                    : 'border-[#52B788]/20 text-[#74C69D]/50 hover:border-[#52B788]/40 hover:text-[#74C69D]'
                }`}>{f.label}</button>
            ))}
          </div>
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterCat('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterCat==='all' ? 'bg-[#40916C] border-[#40916C] text-white' : 'border-[#52B788]/20 text-[#74C69D]/50 hover:border-[#52B788]/40 hover:text-[#74C69D]'}`}>
              Semua Kategori
            </button>
            {Object.entries(EVENT_CATEGORY_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilterCat(key as EventCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filterCat === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-[#52B788]/20 text-[#74C69D]/50 hover:border-[#52B788]/40 hover:text-[#74C69D]'
                }`}>
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events grid */}
      <section className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({length:3}).map((_,i) => (
                <div key={i} className="h-80 rounded-2xl animate-pulse border border-[#52B788]/10"
                  style={{background:'rgba(82,183,136,0.04)'}}/>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏸</div>
              <h3 className="text-white font-bold font-display text-lg mb-2">Belum Ada Event</h3>
              <p className="text-[#74C69D]/40 text-sm">
                {displayEvents.length === 0
                  ? 'Belum ada event yang dijadwalkan. Pantau terus halaman ini.'
                  : 'Tidak ada event yang sesuai filter yang dipilih.'}
              </p>
              {displayEvents.length > 0 && (
                <button onClick={() => { setFilterStatus('all'); setFilterCat('all'); }}
                  className="mt-4 text-[#52B788] text-sm hover:underline">Reset filter</button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(event => (
                <EventCard key={event.id} event={event} waNumber={settings.whatsapp_number}/>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-[#52B788]/20 p-6 sm:p-8 text-center"
            style={{ background: 'linear-gradient(135deg, #0d2b1a 0%, #0D1F16 100%)' }}>
            <h3 className="font-bold text-white font-display text-xl mb-2">Ingin Mengadakan Event?</h3>
            <p className="text-[#A8D5BC]/60 text-sm mb-5 max-w-md mx-auto">
              Hubungi kami untuk booking lapangan khusus event, turnamen, atau pelatihan badminton.
            </p>
            <a href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent('Halo, saya ingin info mengenai pengadaan event/turnamen badminton.')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#40916C] hover:bg-[#52B788] text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-[#40916C]/20">
              💬 Hubungi via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#52B788]/10 px-4 sm:px-6 lg:px-8 py-6" style={{background:'rgba(0,0,0,0.3)'}}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#40916C] flex items-center justify-center"><span>🏸</span></div>
            <div>
              <div className="text-sm font-bold text-white font-display">{settings.court_name}</div>
              <div className="text-xs text-[#74C69D]/40">Event & Turnamen</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#74C69D]/40">
            <a href="/" className="hover:text-[#74C69D] transition-colors">← Jadwal Lapangan</a>
            <a href={`https://wa.me/${settings.whatsapp_number}`} target="_blank" rel="noopener noreferrer"
              className="text-[#52B788] hover:text-[#74C69D] transition-colors font-medium">WhatsApp Admin ↗</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
