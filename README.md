# 🏸 Aplikasi Booking Lapangan Badminton

Sistem booking lapangan badminton online dengan tampilan jadwal real-time dan panel admin untuk verifikasi booking.

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS (custom design system)
- **Database**: Supabase (PostgreSQL + Realtime + Auth)
- **Booking**: Manual via WhatsApp (wa.me link)

---

## 📋 Fitur

### Halaman Publik (Customer)
- ✅ Lihat jadwal per tanggal (7 hari ke depan)
- ✅ Status slot: Tersedia / Menunggu Konfirmasi / Terisi
- ✅ Klik slot tersedia → langsung ke WhatsApp dengan pesan otomatis
- ✅ Update real-time (Supabase Realtime)
- ✅ Responsive: mobile, tablet, desktop

### Panel Admin (`/admin`)
- ✅ Login dengan Supabase Auth
- ✅ Dashboard jadwal per tanggal (grid view)
- ✅ Konfirmasi / Tolak booking pending langsung dari grid
- ✅ Daftar semua booking mendatang
- ✅ Tambah booking manual (dari telepon/langsung)
- ✅ Hapus booking

---

## 🚀 Cara Setup

### 1. Clone & Install

```bash
git clone <repo>
cd badminton-court-booking
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Pergi ke **SQL Editor** dan jalankan isi file `supabase-schema.sql`
3. Buat admin user di **Authentication > Users > Invite User**

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Isi `.env.local` dengan data dari **Supabase Dashboard > Project Settings > API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

NEXT_PUBLIC_WHATSAPP_NUMBER=6281234567890
NEXT_PUBLIC_COURT_NAME=GOR Badminton Sinar Jaya
NEXT_PUBLIC_COURT_ADDRESS=Jl. Raya Badminton No. 1, Jakarta
```

### 4. Jalankan Development

```bash
npm run dev
```

Buka: http://localhost:3000

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── page.tsx              # Halaman publik (jadwal + cara booking)
│   ├── globals.css           # Global styles + Tailwind
│   ├── layout.tsx            # Root layout
│   ├── admin/
│   │   ├── page.tsx          # Halaman login admin
│   │   └── dashboard/
│   │       └── page.tsx      # Dashboard admin (jadwal, daftar, tambah)
│   └── api/
│       └── bookings/
│           └── route.ts      # REST API endpoint
├── components/
│   ├── Navbar.tsx            # Navigasi publik
│   └── ScheduleGrid.tsx      # Grid jadwal interaktif
├── lib/
│   └── supabase.ts           # Supabase client config
└── types/
    └── booking.ts            # TypeScript types + utilities
```

---

## 📊 Alur Kerja Booking

```
Customer melihat jadwal
        ↓
Klik slot kosong (hijau)
        ↓
Redirect ke WhatsApp admin
        ↓
Admin terima pesan WA
        ↓
Admin masuk ke /admin/dashboard
        ↓
Admin klik "Tambah Booking" → input data → status: confirmed
   ATAU customer request → status: pending → admin konfirmasi/tolak
        ↓
Jadwal terupdate real-time
```

---

## 🎨 Halaman & URL

| URL | Deskripsi |
|-----|-----------|
| `/` | Halaman publik - jadwal lapangan |
| `/admin` | Login admin |
| `/admin/dashboard` | Dashboard manajemen booking |
| `/api/bookings` | REST API endpoint |

---

## 🔐 Keamanan

- **Row Level Security (RLS)** aktif di Supabase
- Customer hanya bisa **baca** booking confirmed/pending
- Customer bisa **insert** booking baru (status: pending)
- Admin (authenticated) bisa **update/delete** semua booking
- Service Role Key **tidak** terekspos ke client

---

## 📱 Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| Mobile < 640px | 2 kolom slot, menu hamburger |
| Tablet 640–1024px | 3 kolom slot |
| Desktop > 1024px | 4 kolom slot, full navbar |

---

## 🛠️ Deploy ke Vercel

```bash
npm run build  # test build locally

# Push ke GitHub, lalu:
# 1. Import project di vercel.com
# 2. Tambahkan environment variables
# 3. Deploy!
```

---

## ⚙️ Kustomisasi

Edit `.env.local` untuk mengubah:
- Nama & alamat GOR
- Nomor WhatsApp admin
- Jam operasional → edit `OPENING_HOUR` & `CLOSING_HOUR` di `src/types/booking.ts`
- Harga per jam → tambahkan di database dan tampilkan di frontend
