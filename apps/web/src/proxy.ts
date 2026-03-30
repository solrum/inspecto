import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const defaultLocale = 'en';
const locales = new Set([defaultLocale]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract first segment as potential locale
  const segments = pathname.split('/');
  const firstSegment = segments[1] ?? '';

  // Already has valid locale prefix → pass through
  if (locales.has(firstSegment)) return;

  // Has an invalid locale-like prefix (2-char segment, e.g. /vi/, /fr/) → replace with default
  if (firstSegment.length === 2) {
    segments[1] = defaultLocale;
    request.nextUrl.pathname = segments.join('/');
    return NextResponse.redirect(request.nextUrl);
  }

  // No locale prefix at all → add default
  request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ['/((?!_next|api|favicon\\.svg|.*\\..*).*)',],
};
