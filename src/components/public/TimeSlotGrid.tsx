// src/components/public/TimeSlotGrid.tsx
// Komponen ini menampilkan grid slot waktu dan menangani dua mode:
//   - 'whatsapp' → buka WhatsApp
//   - 'direct'   → buka BookingModal (pembayaran online)

'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import BookingModal from './BookingModal';
import { BookingMode } from '@/types/payment';

interface Court {
  id:            string;
  name:          string;
  price_per_hour:number;
  is_active:     boolean;
  created_at:     string; // ← tambahkan ini
}

interface BookedSlot {
  start_time: string;  // HH:mm
  end_time:   string;
  court_id:   string | null;
}

interface Props {
  selectedDate:  string;         // YYYY-MM-DD
  bookedSlots:   BookedSlot[];
  courts:        Court[];
  openingHour:   number;
  closingHour:   number;
  pricePerHour:  number;         // fallback kalau tidak ada courts
  whatsappNumber:string;
  courtName:     string;         // display name
  bookingMode:   BookingMode;    // 'whatsapp' | 'direct'
}

function buildWhatsappText(params: {
  customerName?: string;
  date:       string;
  start:      string;
  end:        string;
  courtName:  string;
  duration:   number;
}): string {
  const dateLabel = format(new Date(params.date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id });
  return encodeURIComponent(
    `Halo, saya ingin booking lapangan ${params.courtName}:\n` +
    `📅 Tanggal : ${dateLabel}\n` +
    `⏰ Jam     : ${params.start} – ${params.end} WIB\n` +
    `⏱️ Durasi : ${params.duration} jam\n\n` +
    `Mohon konfirmasinya. Terima kasih 🙏`
  );
}

export default function TimeSlotGrid({
  selectedDate, bookedSlots, courts,
  openingHour, closingHour,
  pricePerHour, whatsappNumber, courtName, bookingMode,
}: Props) {
  const [modalOpen, setModalOpen]         = useState(false);
  const [selectedSlot, setSelectedSlot]   = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  // Generate jam dari opening → closing
  const hours = Array.from(
    { length: closingHour - openingHour },
    (_, i) => `${(openingHour + i).toString().padStart(2, '0')}:00`
  );

  // Aktif court (gunakan pertama jika hanya satu)
  const activeCourts = courts.filter(c => c.is_active);
  const singleCourt  = activeCourts.length === 1 ? activeCourts[0] : null;

  const isBooked = (hour: string, court?: Court): boolean => {
    return bookedSlots.some(slot => {
      const courtMatch = !court || !slot.court_id || slot.court_id === court.id;
      return courtMatch && hour >= slot.start_time && hour < slot.end_time;
    });
  };

  const handleSlotClick = (hour: string, court: Court | null = null) => {
    if (isBooked(hour, court ?? undefined)) return;

    const actualCourt = court ?? singleCourt ?? null;
    setSelectedSlot(hour);
    setSelectedCourt(actualCourt);

    if (bookingMode === 'direct') {
      setModalOpen(true);
    } else {
      // Whatsapp mode
      const endH  = parseInt(hour) + 1;
      const end   = `${endH.toString().padStart(2, '0')}:00`;
      const text  = buildWhatsappText({
        date:      selectedDate,
        start:     hour,
        end,
        courtName: actualCourt?.name ?? courtName,
        duration:  1,
      });
      const phone = whatsappNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    }
  };

  if (!selectedDate) return (
    <div className="flex flex-col items-center justify-center py-12 space-y-2">
      <div className="text-4xl opacity-30">📅</div>
      <p className="text-[#74C69D]/40 text-sm">Pilih tanggal untuk melihat jadwal</p>
    </div>
  );

  // ── MULTI-COURT VIEW ─────────────────────────────────────────────────────
  if (activeCourts.length > 1) {
    return (
      <>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[400px] text-xs">
            <thead>
              <tr>
                <th className="py-2 px-3 text-left text-[#74C69D]/40 font-medium w-16">Jam</th>
                {activeCourts.map(court => (
                  <th key={court.id} className="py-2 px-2 text-center text-[#74C69D]/60 font-semibold">
                    {court.name}
                    <div className="text-[10px] text-[#74C69D]/30 font-normal">
                      Rp {court.price_per_hour.toLocaleString('id')}/jam
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map(hour => (
                <tr key={hour} className="border-t border-[#52B788]/8">
                  <td className="py-2 px-3 text-[#74C69D]/50 font-mono">{hour}</td>
                  {activeCourts.map(court => {
                    const booked = isBooked(hour, court);
                    return (
                      <td key={court.id} className="py-1 px-2 text-center">
                        <button
                          onClick={() => handleSlotClick(hour, court)}
                          disabled={booked}
                          className={`w-full py-2 rounded-lg font-semibold transition-all text-[10px] ${
                            booked
                              ? 'bg-red-500/10 text-red-400/50 border border-red-500/15 cursor-not-allowed'
                              : bookingMode === 'direct'
                                ? 'bg-[#40916C]/15 border border-[#40916C]/25 text-[#52B788] hover:bg-[#40916C]/30 hover:border-[#40916C]/50 active:scale-95'
                                : 'bg-[#25D366]/10 border border-[#25D366]/20 text-[#4ADE80] hover:bg-[#25D366]/20 active:scale-95'
                          }`}
                        >
                          {booked ? 'Penuh' : bookingMode === 'direct' ? '💳 Pesan' : '💬 WA'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modalOpen && (
          <BookingModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            selectedCourt={selectedCourt}
            pricePerHour={selectedCourt?.price_per_hour ?? pricePerHour}
            openingHour={openingHour}
            closingHour={closingHour}
            courtName={selectedCourt?.name ?? courtName}
          />
        )}
      </>
    );
  }

  // ── SINGLE-COURT VIEW (default) ──────────────────────────────────────────
  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {hours.map(hour => {
          const booked  = isBooked(hour, singleCourt ?? undefined);
          const endH    = parseInt(hour) + 1;
          const endTime = `${endH.toString().padStart(2, '0')}:00`;

          return (
            <button
              key={hour}
              onClick={() => handleSlotClick(hour)}
              disabled={booked}
              className={`relative flex flex-col items-center justify-center py-3 px-2 rounded-xl border font-semibold text-xs transition-all group ${
                booked
                  ? 'bg-red-500/8 border-red-500/15 text-red-400/40 cursor-not-allowed'
                  : bookingMode === 'direct'
                    ? 'bg-[#40916C]/10 border-[#40916C]/20 text-[#52B788] hover:bg-[#40916C]/25 hover:border-[#40916C]/50 hover:shadow-lg hover:shadow-[#40916C]/10 active:scale-95'
                    : 'bg-[#25D366]/8 border-[#25D366]/15 text-[#4ADE80] hover:bg-[#25D366]/18 hover:border-[#25D366]/35 active:scale-95'
              }`}
            >
              <span className="font-bold">{hour}</span>
              <span className={`text-[10px] mt-0.5 ${booked ? 'text-red-400/30' : 'text-[#74C69D]/30 group-hover:text-[#74C69D]/60'}`}>
                {booked ? '✕ Penuh' : `s/d ${endTime}`}
              </span>
              {!booked && (
                <span className={`mt-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                  bookingMode === 'direct'
                    ? 'bg-[#40916C]/20 text-[#52B788]/70'
                    : 'bg-[#25D366]/15 text-[#4ADE80]/60'
                }`}>
                  {bookingMode === 'direct' ? '💳 Bayar' : '💬 WA'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[#74C69D]/40 mt-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-md border ${
            bookingMode === 'direct' ? 'bg-[#40916C]/10 border-[#40916C]/20' : 'bg-[#25D366]/8 border-[#25D366]/15'
          }`}/>
          <span>Tersedia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-red-500/8 border border-red-500/15"/>
          <span>Penuh</span>
        </div>
      </div>

      {modalOpen && (
        <BookingModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          selectedCourt={selectedCourt}
          pricePerHour={pricePerHour}
          openingHour={openingHour}
          closingHour={closingHour}
          courtName={courtName}
        />
      )}
    </>
  );
}
