import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next();
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
    const isAdminLogin = request.nextUrl.pathname === '/admin';

    if (!isAdminRoute) {
      return response;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (isAdminLogin) {
      if (session && !sessionError) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return response;
    }

    if (!session || sessionError) {
      const redirectUrl = new URL('/admin', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('[Middleware] Auth check error:', error);
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
