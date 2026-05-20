export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type UserRole = 'operator' | 'admin' | 'superadmin';

export interface Court {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  price_per_hour: number;
  created_at: string;
}

export interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: BookingStatus;
  notes?: string;
  admin_notes?: string;
  court_id?: string;
  court?: Court;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  user_id: string;
  role: UserRole;
  email?: string;
}

export interface SettingRow {
  key: string;
  value: string;
  label?: string;
  updated_at?: string;
}

export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 22;

export function generateTimeSlots(openHour = OPENING_HOUR, closeHour = CLOSING_HOUR): string[] {
  const slots: string[] = [];
  for (let h = openHour; h < closeHour; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

export function formatTime(time: string): string {
  const [h] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const m = time.split(':')[1];
  return `${displayH}:${m} ${period}`;
}

export function isSlotBooked(slot: string, bookings: Booking[]): Booking | null {
  for (const booking of bookings) {
    if (booking.status === 'cancelled') continue;
    const start = booking.start_time.slice(0, 5);
    const end   = booking.end_time.slice(0, 5);
    if (slot >= start && slot < end) return booking;
  }
  return null;
}

export const STATUS_CONFIG: Record<BookingStatus, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  pending:   { label:'Menunggu',      color:'text-amber-700',       bg:'bg-amber-50',            border:'border-amber-200',  dot:'bg-amber-500'  },
  confirmed: { label:'Dikonfirmasi',  color:'text-green-700',       bg:'bg-green-50',            border:'border-green-200',  dot:'bg-green-500'  },
  cancelled: { label:'Dibatalkan',    color:'text-red-700',         bg:'bg-red-50',              border:'border-red-200',    dot:'bg-red-400'    },
};

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string }> = {
  operator:   { label:'Operator',    color:'text-blue-700',   bg:'bg-blue-50'         },
  admin:      { label:'Admin',       color:'text-green-700',  bg:'bg-green-50'        },
  superadmin: { label:'Super Admin', color:'text-purple-700', bg:'bg-purple-50'       },
};
