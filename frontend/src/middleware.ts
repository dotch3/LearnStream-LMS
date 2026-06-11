import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const apiUrl = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/setup/status`, { cache: 'no-store' });
    const data = (await res.json()) as { isSetupComplete: boolean };

    const publicPaths = ['/setup', '/invite'];
    const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
    if (!data.isSetupComplete && !isPublic) {
      return NextResponse.redirect(new URL('/setup', request.url));
    }

    if (data.isSetupComplete && pathname === '/setup') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch {
    // Backend unreachable — pass through so the app doesn't hard-block
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
