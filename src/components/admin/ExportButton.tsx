'use client';

import { useRef, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Booking } from '@/types/booking';

function exportCSV(data: Booking[], filename: string) {
  const headers = ['No','Tanggal','Jam Mulai','Jam Selesai','Durasi (jam)','Lapangan',
                   'Nama Customer','No HP','Status','Catatan','Dibuat'];
  const rows = data.map((b, i) => [
    i + 1, b.booking_date, b.start_time.slice(0,5), b.end_time.slice(0,5),
    b.duration_hours, b.court?.name ?? '-',
    b.customer_name, b.customer_phone, b.status,
    b.notes ?? '', format(parseISO(b.created_at), 'dd/MM/yyyy HH:mm'),
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(data: Booking[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  allBookings: Booking[];
  periodBookings: Booking[];
  periodLabel: string;
}

export function ExportButton({ allBookings, periodBookings, periodLabel }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ts  = format(new Date(), 'yyyyMMdd-HHmm');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const confirmed = allBookings.filter(b => b.status === 'confirmed');
  const pending   = allBookings.filter(b => b.status === 'pending');

  const opts = [
    { id: 'period',    label: `📅 Periode Aktif`,   sub: `${periodLabel} · ${periodBookings.length} data`, action: () => exportCSV([...periodBookings].sort((a,b)=>a.booking_date.localeCompare(b.booking_date)), `booking-periode_${ts}.csv`) },
    { id: 'all',       label: '🗂 Semua Booking',    sub: `${allBookings.length} data`, action: () => exportCSV([...allBookings].sort((a,b)=>a.booking_date.localeCompare(b.booking_date)), `booking-semua_${ts}.csv`) },
    { id: 'confirmed', label: '✅ Confirmed saja',   sub: `${confirmed.length} data`,  action: () => exportCSV([...confirmed].sort((a,b)=>a.booking_date.localeCompare(b.booking_date)), `booking-confirmed_${ts}.csv`) },
    { id: 'pending',   label: '⏳ Pending saja',     sub: `${pending.length} data`,    action: () => exportCSV([...pending], `booking-pending_${ts}.csv`) },
    { id: 'json',      label: '{ } Semua (JSON)',    sub: `${allBookings.length} data · untuk developer`, action: () => exportJSON([...allBookings].sort((a,b)=>a.booking_date.localeCompare(b.booking_date)), `booking-semua_${ts}.json`) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#40916C] hover:bg-[#52B788] text-white text-xs font-semibold transition-all shadow-lg shadow-[#40916C]/20"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Export
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-[#52B788]/20 z-30 overflow-hidden animate-scale-in"
          style={{ background: '#0D2B1C', backdropFilter: 'blur(16px)' }}>
          {opts.map((opt, i) => (
            <div key={opt.id}>
              {i === opts.length - 1 && <div className="border-t border-[#52B788]/10"/>}
              <button
                onClick={() => { setOpen(false); opt.action(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#52B788]/10 transition-colors"
              >
                <div className="text-xs font-medium text-white">{opt.label}</div>
                <div className="text-[10px] text-[#74C69D]/40">{opt.sub}</div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
