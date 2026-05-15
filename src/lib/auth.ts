import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'fallback-secret-change-in-production'
);

export async function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  
  if (!sessionCookie) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, SECRET_KEY);
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(username: string, options?: { secure?: boolean }) {
  const token = await new SignJWT({ username, authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);

  return token;
}

export async function authMiddleware(request: NextRequest) {
  const session = await getSession(request);
  const { pathname } = request.nextUrl;

  // Allow login page, auth API routes, and public APIs
  if (
    pathname === '/login' || 
    pathname.startsWith('/api/auth') ||
    pathname === '/api/tasks' ||
    pathname === '/api/status' ||
    pathname.startsWith('/api/status/') ||
    pathname === '/api/subagents' ||
    pathname.startsWith('/api/subagents/') ||
    pathname === '/api/agents' ||
    pathname.startsWith('/api/agents/') ||
    pathname === '/api/jobs' ||
    pathname.startsWith('/api/jobs/') ||
    pathname === '/api/transcriptions' ||
    pathname.startsWith('/api/transcriptions/') ||
    pathname === '/api/transcriptions-file' ||
    pathname.startsWith('/api/transcriptions-file/') ||
    pathname === '/agents' ||
    pathname.startsWith('/agents/') ||
    pathname === '/jobs' ||
    pathname.startsWith('/jobs/') ||
    pathname === '/tasks' ||
    pathname.startsWith('/tasks/') ||
    pathname === '/transcriptions' ||
    pathname.startsWith('/transcriptions/')
  ) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
