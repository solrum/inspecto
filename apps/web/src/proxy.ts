import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const defaultLocale = 'en';
const locales = ['en'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Already has locale prefix
  const hasLocale = locales.some(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
  );
  if (hasLocale) return;

  // Add locale prefix
  request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ['/((?!_next|api|favicon\\.ico|.*\\..*).*)',],
};
