# 🔍 Panduan SEO — Booking Lapangan Badminton

## Yang Sudah Otomatis (Tidak Perlu Diubah)

### ✅ Metadata Dinamis dari Database
- `<title>` — nama GOR dari settings DB
- `<meta description>` — deskripsi + jam buka + harga dari DB
- Open Graph (preview WhatsApp, Facebook, Telegram)
- Twitter Card
- Canonical URL
- JSON-LD Structured Data (Google Rich Results)

### ✅ Technical SEO
- `sitemap.xml` — otomatis di `/sitemap.xml`
- `robots.txt` — di `/robots.txt`, admin diblokir
- HTTP security headers
- Cache-Control untuk performa
- PWA manifest

---

## Yang Perlu Dilakukan Manual

### 1. Tambahkan NEXT_PUBLIC_SITE_URL ke .env.local
```env
NEXT_PUBLIC_SITE_URL=https://nama-domain-anda.com
```
Tanpa ini, canonical URL dan sitemap akan pakai placeholder `your-domain.com`.

### 2. Buat OG Image (1200×630 px)
File: `public/og-image.png`

Konten yang disarankan:
- Background dark green (#0D1F16)
- Logo/nama GOR di tengah
- Teks "Booking Lapangan Badminton Online"
- Jam buka & nomor WA

Tools gratis: [Canva](https://canva.com), [Figma](https://figma.com)

**Penting**: Tanpa file ini, preview link WhatsApp/Facebook tidak tampil gambar.

### 3. Buat Icon Files
Taruh di folder `public/`:
- `favicon.ico` — 32×32 px
- `icon-192.png` — 192×192 px (PWA)
- `icon-512.png` — 512×512 px (PWA)
- `apple-icon.png` — 180×180 px (iOS)

Tools: [Favicon.io](https://favicon.io) — upload logo, download semua ukuran.

### 4. Submit ke Google Search Console
1. Buka [search.google.com/search-console](https://search.google.com/search-console)
2. Tambah property → masukkan domain
3. Verifikasi kepemilikan (pilih metode HTML tag)
4. Copy kode verifikasi ke `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_VERIFICATION=kode_dari_google
   ```
5. Uncomment baris `verification` di `src/app/layout.tsx`
6. Submit sitemap: `https://domain-anda.com/sitemap.xml`

### 5. Daftarkan ke Google Business Profile (GRATIS, sangat efektif)
1. Buka [business.google.com](https://business.google.com)
2. Buat profil bisnis dengan kategori "Sports Complex" atau "Badminton Court"
3. Isi alamat, jam buka, nomor WA, website
4. Upload foto lapangan (min. 5 foto)
5. Setelah verified, bisnis muncul di Google Maps dan pencarian lokal

---

## Optimasi Konten (Lakukan Sekali)

### Nama GOR di Settings
Gunakan nama yang mengandung keyword lokal, contoh:
- ❌ "GOR Badminton Sinar Jaya"
- ✅ "GOR Badminton Sinar Jaya Jakarta Selatan"
- ✅ "Lapangan Badminton Depok - Sinar Jaya Sport"

### Alamat Lengkap di Settings
Isi dengan kecamatan/kota agar muncul di pencarian lokal:
```
Jl. Raya Badminton No. 1, Kelurahan X, Kecamatan Y, Jakarta Selatan
```

---

## Cek SEO (Setelah Deploy)

| Tool | URL | Cek Apa |
|------|-----|---------|
| Google Rich Results | [search.google.com/test/rich-results](https://search.google.com/test/rich-results) | JSON-LD valid |
| Open Graph Debugger | [developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug) | Preview Facebook/WA |
| Twitter Card Validator | [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) | Preview Twitter |
| PageSpeed Insights | [pagespeed.web.dev](https://pagespeed.web.dev) | Core Web Vitals |
| Mobile Friendly | [search.google.com/test/mobile-friendly](https://search.google.com/test/mobile-friendly) | Responsif |
| Structured Data | [validator.schema.org](https://validator.schema.org) | Schema.org valid |

---

## Timeline Ekspektasi

| Waktu | Yang Terjadi |
|-------|-------------|
| Hari 1 | Submit sitemap, Google mulai crawl |
| 3–7 hari | Halaman muncul di indeks Google |
| 2–4 minggu | Mulai muncul di hasil pencarian |
| 1–3 bulan | Ranking membaik dengan konten & backlink |

---

## Tips Tambahan

- **WhatsApp Preview** — pastikan `og-image.png` ada agar link preview muncul gambar saat share di WA
- **Kecepatan** — halaman sudah dioptimasi dengan `stale-while-revalidate`, tapi kompres gambar sebelum upload
- **Backlink lokal** — minta dicantumkan di grup olahraga lokal, forum badminton, Instagram, dll
- **Pengumuman** — gunakan fitur Pengumuman di `/admin/settings` untuk info terkini; konten fresh membantu SEO
