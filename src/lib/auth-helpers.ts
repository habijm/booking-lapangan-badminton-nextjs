import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { UserRole } from '@/types/booking';

export interface AuthResult {
  authorized: boolean;
  response?: NextResponse;
  session?: {
    user_id: string;
    email: string;
    role: UserRole;
  };
}

export function verifyCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  const normalizeOrigin = (value: string) => {
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  };

  const configuredOrigin = siteUrl ? normalizeOrigin(siteUrl) : null;
  const requestOrigin = normalizeOrigin(request.nextUrl.origin);
  const allowedOrigins = new Set<string>();

  if (configuredOrigin) allowedOrigins.add(configuredOrigin);

  // Keep local development usable even when .env.local contains the deployed URL.
  if (request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1') {
    if (requestOrigin) allowedOrigins.add(requestOrigin);
  }

  if (origin && !allowedOrigins.has(normalizeOrigin(origin) ?? '')) {
    return false;
  }

  if (referer && !allowedOrigins.has(normalizeOrigin(referer) ?? '')) {
    return false;
  }

  return true;
}

export function csrfErrorResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Invalid request origin' },
    { status: 403 }
  );
}

export async function verifyAdminSession(
  request: NextRequest,
  requiredRoles?: UserRole[]
): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Cookie already set by middleware
            }
          },
        },
      }
    );

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized - Silakan login terlebih dahulu' },
          { status: 401 }
        ),
      };
    }

    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleError || !roleData) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden - Anda tidak memiliki akses admin' },
          { status: 403 }
        ),
      };
    }

    const userRole = roleData.role as UserRole;

    if (requiredRoles && requiredRoles.length > 0) {
      const roleHierarchy: Record<UserRole, number> = {
        operator: 1,
        admin: 2,
        superadmin: 3,
      };

      const userLevel = roleHierarchy[userRole] || 0;
      const minRequiredLevel = Math.min(
        ...requiredRoles.map(r => roleHierarchy[r] || 0)
      );

      if (userLevel < minRequiredLevel) {
        return {
          authorized: false,
          response: NextResponse.json(
            { error: 'Forbidden - Role tidak mencukupi untuk aksi ini' },
            { status: 403 }
          ),
        };
      }
    }

    return {
      authorized: true,
      session: {
        user_id: session.user.id,
        email: session.user.email || '',
        role: userRole,
      },
    };
  } catch (error) {
    console.error('[Auth] Error verifying session:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

export function withAuth(
  handler: (req: NextRequest, auth: NonNullable<AuthResult['session']>) => Promise<NextResponse>,
  requiredRoles?: UserRole[]
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await verifyAdminSession(req, requiredRoles);

    if (!result.authorized || !result.session) {
      return result.response!;
    }

    return handler(req, result.session);
  };
}
