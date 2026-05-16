export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string; // ISO date string: "2024-01-15"
  start_time: string;   // "08:00"
  end_time: string;     // "09:00"
  duration_hours: 1 | 2;
  status: BookingStatus;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  time: string;       // "08:00"
  label: string;      // "08:00 - 09:00"
  available: boolean;
  booking?: Booking;
}

export interface BookingFormData {
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  duration_hours: 1 | 2;
  notes?: string;
}

// Operating hours
export const OPENING_HOUR = 8;   // 08:00
export const CLOSING_HOUR = 22;  // 22:00

// Generate all possible time slots
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = OPENING_HOUR; h < CLOSING_HOUR; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

export function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const newH = h + hours;
  return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function isSlotBooked(slot: string, bookings: Booking[]): Booking | null {
  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue;
    const start = booking.start_time.slice(0, 5);
    const end = booking.end_time.slice(0, 5);
    if (slot >= start && slot < end) {
      return booking;
    }
  }
  return null;
}

export const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string; border: string }> = {
  pending: {
    label: 'Menunggu',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  confirmed: {
    label: 'Dikonfirmasi',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  cancelled: {
    label: 'Dibatalkan',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};
