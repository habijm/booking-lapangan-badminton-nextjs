'use client';

import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

export function MiniCalendar({ bookingsByDate, month }: {
  bookingsByDate: Record<string, number>; month: Date;
}) {
  const days     = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDay = startOfMonth(month).getDay();
  const max      = Math.max(...Object.values(bookingsByDate), 1);

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['M','S','S','R','K','J','S'].map((d, i) => (
          <div key={i} className="text-[10px] text-[#74C69D]/30 text-center font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`}/>)}
        {days.map(day => {
          const key   = format(day, 'yyyy-MM-dd');
          const count = bookingsByDate[key] || 0;
          const intensity = count > 0 ? Math.max(0.2, count / max) : 0;
          const isToday   = isSameDay(day, new Date());
          return (
            <div key={key}
              title={`${format(day, 'd MMM')}: ${count} booking`}
              className={`aspect-square rounded flex items-center justify-center text-[9px] font-medium cursor-default ${
                isToday ? 'ring-1 ring-[#52B788] ring-offset-1 ring-offset-[#0D1F16]' : ''
              }`}
              style={{
                backgroundColor: count > 0
                  ? `rgba(64,145,108,${intensity})`
                  : 'rgba(255,255,255,0.03)',
                color: intensity > 0.5 ? 'white' : 'rgba(116,198,157,0.4)',
              }}>
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
}
