import { NextRequest } from 'next/server';
import { authMiddleware } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths.
     * The authMiddleware function handles the actual public/protected logic.
     * Only _next/static, _next/image, and favicon.ico are truly skipped.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
