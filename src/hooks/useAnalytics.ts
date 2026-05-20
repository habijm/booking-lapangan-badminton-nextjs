'use client';

import { useMemo } from 'react';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { Booking } from '@/types/booking';

export interface DayDataPoint {
  label: string;
  sublabel: string;
  value: number;
  date: string;
}

export interface AnalyticsResult {
  confirmed:         Booking[];
  pending:           Booking[];
  cancelled:         Booking[];
  periodConfirmed:   Booking[];
  periodBookings:    Booking[];
  periodRevenue:     number;
  periodHours:       number;
  dailyBarData:      DayDataPoint[];
  peakHoursData:     { label: string; sublabel: string; value: number }[];
  dowData:           { label: string; value: number }[];
  bookingsByDate:    Record<string, number>;
  topCustomers:      { name: string; phone: string; count: number; hours: number; revenue: number }[];
  thisMonthBookings: Booking[];
  lastMonthBookings: Booking[];
  thisMonthRevenue:  number;
  lastMonthRevenue:  number;
  bookingGrowth:     number;
  revenueGrowth:     number;
}

export function useAnalytics(
  allBookings: Booking[],
  periodFrom: string,
  periodTo: string,
  pricePerHour: number,
  openingHour: number,
  closingHour: number,
): AnalyticsResult {
  return useMemo(() => {
    const today         = format(new Date(), 'yyyy-MM-dd');
    const thisMonthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
    const lastMonthStart = format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM-dd');
    const lastMonthEnd   = format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), 'yyyy-MM-dd');

    const confirmed  = allBookings.filter(b => b.status === 'confirmed');
    const pending    = allBookings.filter(b => b.status === 'pending');
    const cancelled  = allBookings.filter(b => b.status === 'cancelled');

    const periodBookings  = allBookings.filter(b => b.booking_date >= periodFrom && b.booking_date <= periodTo);
    const periodConfirmed = periodBookings.filter(b => b.status === 'confirmed');
    const periodRevenue   = periodConfirmed.reduce((s, b) => s + b.duration_hours * pricePerHour, 0);
    const periodHours     = periodConfirmed.reduce((s, b) => s + b.duration_hours, 0);

    const thisMonthBookings = confirmed.filter(b => b.booking_date >= thisMonthStart && b.booking_date <= today);
    const lastMonthBookings = confirmed.filter(b => b.booking_date >= lastMonthStart && b.booking_date <= lastMonthEnd);
    const thisMonthRevenue  = thisMonthBookings.reduce((s, b) => s + b.duration_hours * pricePerHour, 0);
    const lastMonthRevenue  = lastMonthBookings.reduce((s, b) => s + b.duration_hours * pricePerHour, 0);
    const bookingGrowth     = lastMonthBookings.length > 0 ? Math.round(((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100) : 0;
    const revenueGrowth     = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

    // Daily bar data
    const days = eachDayOfInterval({ start: parseISO(periodFrom), end: parseISO(periodTo) });
    const dailyBarData: DayDataPoint[] = days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      return {
        label:    days.length <= 14 ? format(day, 'd/M') : days.length <= 31 ? format(day, 'd') : format(day, 'MMM'),
        sublabel: format(day, 'EEE, d MMM yyyy', { locale: id }),
        value:    periodConfirmed.filter(b => b.booking_date === key).length,
        date:     key,
      };
    });

    // Peak hours
    const hourCount: Record<string, number> = {};
    for (let h = openingHour; h < closingHour; h++) hourCount[`${h}`] = 0;
    periodConfirmed.forEach(b => {
      const s = parseInt(b.start_time.slice(0, 2));
      const e = parseInt(b.end_time.slice(0, 2));
      for (let h = s; h < e; h++) hourCount[`${h}`] = (hourCount[`${h}`] || 0) + 1;
    });
    const peakHoursData = Object.entries(hourCount).map(([h, v]) => ({
      label: h, sublabel: `${h}:00–${parseInt(h) + 1}:00`, value: v,
    }));

    // Day of week
    const dowLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dowData = dowLabels.map((label, dow) => ({
      label,
      value: periodConfirmed.filter(b => parseISO(b.booking_date).getDay() === dow).length,
    }));

    // Calendar heatmap
    const bookingsByDate: Record<string, number> = {};
    confirmed.forEach(b => { bookingsByDate[b.booking_date] = (bookingsByDate[b.booking_date] || 0) + 1; });

    // Top customers
    const custMap: Record<string, { name: string; phone: string; count: number; hours: number; revenue: number }> = {};
    periodConfirmed.forEach(b => {
      const k = b.customer_phone;
      if (!custMap[k]) custMap[k] = { name: b.customer_name, phone: k, count: 0, hours: 0, revenue: 0 };
      custMap[k].count++;
      custMap[k].hours   += b.duration_hours;
      custMap[k].revenue += b.duration_hours * pricePerHour;
    });
    const topCustomers = Object.values(custMap).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      confirmed, pending, cancelled,
      periodConfirmed, periodBookings, periodRevenue, periodHours,
      dailyBarData, peakHoursData, dowData, bookingsByDate, topCustomers,
      thisMonthBookings, lastMonthBookings, thisMonthRevenue, lastMonthRevenue,
      bookingGrowth, revenueGrowth,
    };
  }, [allBookings, periodFrom, periodTo, pricePerHour, openingHour, closingHour]);
}
