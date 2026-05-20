// Middleware dikosongkan — auth check dilakukan di setiap halaman admin
// menggunakan useEffect + supabase.auth.getSession() langsung
import { NextResponse } from 'next/server';
export function middleware() {
  return NextResponse.next();
}
export const config = { matcher: [] };
