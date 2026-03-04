import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  
  return NextResponse.json({ 
    authenticated: !!session,
    username: session?.username || null 
  });
}
