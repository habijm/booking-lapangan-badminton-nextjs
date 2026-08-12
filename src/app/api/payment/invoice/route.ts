// src/app/api/payment/invoice/route.ts
// Kirim invoice/struk via email menggunakan Resend (https://resend.com)
// Install dulu: npm install resend
// Daftar gratis di resend.com → dapat 3000 email/bulan gratis

import { NextRequest } from 'next/server';
import { sendInvoiceByBookingId } from '@/lib/invoice-email';

// GET /api/payment/invoice?booking_id=xxx  → kirim email invoice
// POST /api/payment/invoice { booking_id } → sama, bisa dari admin
export async function GET(req: NextRequest) {
  return sendInvoice(req.nextUrl.searchParams.get('booking_id'));
}

export async function POST(req: NextRequest) {
  const { booking_id } = await req.json();
  return sendInvoice(booking_id);
}

async function sendInvoice(bookingId: string | null) {
  return sendInvoiceByBookingId(bookingId);
}
