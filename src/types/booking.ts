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

// ─── Events ──────────────────────────────────────────────────────────────────
export type EventCategory = 'tournament' | 'championship' | 'friendly' | 'training' | 'other';
export type EventStatus   = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface BadmintonEvent {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  status: EventStatus;
  start_date: string;
  end_date: string;
  start_time?: string;
  registration_deadline?: string;
  max_participants?: number;
  current_participants: number;
  prize_pool?: string;
  entry_fee: number;
  contact_phone?: string;
  contact_wa?: string;
  image_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export const EVENT_CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: string; color: string; bg: string; border: string }> = {
  tournament:    { label: 'Turnamen',    icon: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  championship:  { label: 'Kejuaraan',   icon: '🥇', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  friendly:      { label: 'Persahabatan',icon: '🤝', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
  training:      { label: 'Pelatihan',   icon: '🎯', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  other:         { label: 'Lainnya',     icon: '📋', color: 'text-[#74C69D]',  bg: 'bg-[#52B788]/10',  border: 'border-[#52B788]/30'  },
};

export const EVENT_STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  upcoming:   { label: 'Akan Datang', color: 'text-[#74C69D]',  bg: 'bg-[#52B788]/10',  border: 'border-[#52B788]/30',  dot: 'bg-[#52B788] animate-pulse' },
  ongoing:    { label: 'Berlangsung', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' },
  completed:  { label: 'Selesai',     color: 'text-white/40',   bg: 'bg-white/5',       border: 'border-white/10',      dot: 'bg-white/30'                 },
  cancelled:  { label: 'Dibatalkan',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400'                  },
};

// ─── Memberships ─────────────────────────────────────────────────────────────
export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  hours_per_session: number;
  sessions_per_week: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface MembershipSchedule {
  id: string;
  membership_id: string;
  day_of_week: number; // 0=Minggu..6=Sabtu
  start_time: string;
  court_id?: string;
  court?: { id: string; name: string };
  created_at: string;
}

export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export interface Membership {
  id: string;
  plan_id: string;
  plan?: MembershipPlan;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  notes?: string;
  total_sessions: number;
  used_sessions: number;
  schedules?: MembershipSchedule[];
  created_at: string;
  updated_at: string;
}

export const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
export const DAY_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

export const MEMBERSHIP_STATUS_CONFIG: Record<MembershipStatus, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  active:    { label:'Aktif',      color:'text-[#74C69D]', bg:'bg-[#52B788]/10', border:'border-[#52B788]/30', dot:'bg-[#52B788] animate-pulse' },
  pending:   { label:'Menunggu',   color:'text-amber-400', bg:'bg-amber-500/10', border:'border-amber-500/30', dot:'bg-amber-400 animate-pulse' },
  expired:   { label:'Habis',      color:'text-white/30',  bg:'bg-white/5',      border:'border-white/10',     dot:'bg-white/20' },
  cancelled: { label:'Dibatalkan', color:'text-red-400',   bg:'bg-red-500/10',   border:'border-red-500/30',   dot:'bg-red-400'  },
};
