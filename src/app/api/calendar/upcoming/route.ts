import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Check Google Calendar events in next 24 hours
    const { stdout } = await execAsync(
      `/home/linuxbrew/.linuxbrew/bin/gog calendar events primary --from "${now.toISOString()}" --to "${in24Hours.toISOString()}" --json --no-input`,
      {
        env: { ...process.env, GOG_KEYRING_BACKEND: 'file', GOG_KEYRING_PASSWORD: 'gogkeyring-8488Carter!' },
        timeout: 15000,
      }
    );
    
    const data = JSON.parse(stdout);
    const events = data.events || [];
    
    // Also check local calendar_events table
    const { execAsync: psqlExec } = await import('child_process').then(() => ({ execAsync }));
    // We'll just return gog events for now
    
    // Filter to events starting in next 24 hours that haven't been alerted yet
    const upcoming = events
      .filter((e: any) => {
        if (!e.start) return false;
        const start = new Date(e.start);
        const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil > 0 && hoursUntil <= 24;
      })
      .map((e: any) => ({
        title: e.summary || 'Untitled',
        start: e.start,
        end: e.end,
        location: e.location || null,
        hoursUntil: Math.round(((new Date(e.start).getTime() - now.getTime()) / (1000 * 60 * 60)) * 10) / 10,
      }));
    
    return NextResponse.json({ upcoming, count: upcoming.length, checkedAt: now.toISOString() });
  } catch (error) {
    console.error('[API /calendar/upcoming] Error:', error);
    return NextResponse.json({ upcoming: [], count: 0, error: true, errorMessage: (error as Error).message }, { status: 500 });
  }
}