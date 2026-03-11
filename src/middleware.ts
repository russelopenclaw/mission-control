import { NextRequest } from 'next/server';
import { authMiddleware } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - API routes for docs (public access)
     * - API routes for calendar (public access)
     * - API routes for brain (public access)
     * - API routes for subagents (public access)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/docs/|api/calendar/|api/brain/|api/subagents/).*)',
  ],
};
