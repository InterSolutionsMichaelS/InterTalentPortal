import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Uses NEXTAUTH_SECRET from env (same value as authOptions.secret).
 * Does not import auth-options here: that module pulls mssql/getPool (Node-only)
 * and must not be bundled into Edge middleware.
 */
const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret,
  });

  const isLoginPath =
    pathname === '/admin/login' || pathname.startsWith('/admin/login/');

  if (isLoginPath) {
    if (token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  const isUsersPath =
    pathname === '/admin/users' || pathname.startsWith('/admin/users/');

  if (isUsersPath) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (token.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
