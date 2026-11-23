import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Immediately route root or locale to the authentic WiseFinance application
  if (pathname === '/' || pathname === '/id' || pathname === '/en') {
    return NextResponse.redirect(new URL('/app.html', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
