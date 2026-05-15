import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  attendees?: string[];
  recurring: boolean;
  reminders: { method: string; minutes: number }[];
  color?: string;
  url?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || new Date().toISOString();
    const to = searchParams.get('to') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

    // Fetch events from Google Calendar
    const { stdout, stderr } = await execAsync(
      `/home/linuxbrew/.linuxbrew/bin/gog calendar events primary --from "${from}" --to "${to}" --json --no-input`,
      { timeout: 15000, env: { ...process.env, GOG_ACCOUNT: 'russelopenclaw@gmail.com', GOG_KEYRING_BACKEND: 'file', GOG_KEYRING_PASSWORD: 'gogkeyring-8488Carter!' } }
    );

    if (stderr && !stderr.includes('Color output')) {
      console.error('[gog calendar events] stderr:', stderr);
    }

    const gogData = JSON.parse(stdout) as any;
    const events = gogData.events || gogData || [];
    if (!Array.isArray(events)) {
      console.error('[gog calendar events] Unexpected format:', typeof events);
      throw new Error('Unexpected gog response format');
    }

    const calendarEvents: CalendarEvent[] = events.map((event) => ({
      id: event.id || '',
      summary: event.summary || 'Untitled',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      allDay: !!event.start?.date,
      location: event.location,
      description: event.description,
      attendees: event.attendees?.map((a: any) => a.email) || [],
      recurring: !!event.recurrence && event.recurrence.length > 0,
      reminders: event.reminders?.useDefault
        ? [{ method: 'default', minutes: 0 }]
        : event.reminders?.overrides?.map((r: any) => ({
            method: r.method,
            minutes: r.minutes || 0,
          })) || [],
      color: event.colorId,
      url: event.htmlLink,
    }));

    const response = NextResponse.json({
      events: calendarEvents,
      calendarId: 'primary',
      fetchedAt: new Date().toISOString(),
    });

    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    return response;
  } catch (error) {
    console.error('[API /calendar/events] Error:', error);

    return NextResponse.json(
      {
        error: true,
        errorMessage: (error as Error).message,
        events: [],
        calendarId: 'primary',
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 } // Return 200 with empty events so health check passes
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      summary,
      start,
      end,
      allDay,
      description,
      location,
      attendees,
      rrule,
      reminders,
      color,
    } = body;

    if (!summary || !start) {
      return NextResponse.json(
        { error: 'summary and start are required' },
        { status: 400 }
      );
    }

    // Add timezone if not already present (Google requires it)
    const timezone = 'America/Chicago';
    let fromTime = start;
    let toTime = end;
    
    // If datetime without timezone suffix, append it
    if (fromTime && !fromTime.includes('+') && !fromTime.endsWith('Z') && !fromTime.includes('T')) {
      // Date-only string for all-day events
    } else if (fromTime && fromTime.includes('T') && !fromTime.includes('+') && !fromTime.endsWith('Z')) {
      // Datetime without timezone - add offset for America/Chicago (CDT = -05:00, CST = -06:00)
      const isDST = (() => {
        const d = new Date(fromTime);
        const jan = new Date(d.getFullYear(), 0, 1);
        const jul = new Date(d.getFullYear(), 6, 1);
        const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
        return d.getTimezoneOffset() < stdOffset;
      })();
      const offset = isDST ? '-05:00' : '-06:00';
      fromTime = fromTime + offset;
      if (toTime && toTime.includes('T') && !toTime.includes('+') && !toTime.endsWith('Z')) {
        toTime = toTime + offset;
      }
    }

    // Build gog command with GOG_ACCOUNT env var
    const args = [
      '/home/linuxbrew/.linuxbrew/bin/gog',
      'calendar',
      'create',
      'primary',
      `--summary "${summary.replace(/"/g, '\\"')}"`,
      `--from "${fromTime}"`,
    ];

    if (toTime) {
      args.push(`--to "${toTime}"`);
    } else if (allDay) {
      // All-day events: end = start + 1 day
      args.push(`--to "${start}"`);
      args.push('--all-day');
    }

    if (description) {
      args.push(`--description "${description.replace(/"/g, '\\"')}"`);
    }

    if (location) {
      args.push(`--location "${location.replace(/"/g, '\\"')}"`);
    }

    if (attendees && attendees.length > 0) {
      args.push(`--attendees "${attendees.join(',')}"`);
    }

    if (rrule) {
      args.push(`--rrule "${rrule}"`);
    }

    if (reminders && reminders.length > 0) {
      for (const reminder of reminders) {
        // reminder: { method: 'popup' | 'email' | 'sms', minutes: number }
        // gog format: method:duration (e.g., popup:30m, email:1d)
        // Skip if 0 minutes (gog will use default reminder)
        const mins = reminder.minutes || 0;
        if (mins === 0) continue; // skip, use Google default
        
        let duration = `${mins}m`;
        if (mins >= 1440 && mins % 1440 === 0) {
          duration = `${mins / 1440}d`; // days if divisible
        }
        args.push(`--reminder ${reminder.method}:${duration}`);
      }
    }

    if (color) {
      args.push(`--event-color ${color}`);
    }

    args.push('--json', '--no-input');

    const command = `/home/linuxbrew/.linuxbrew/bin/gog ${args.slice(1).join(' ')}`;
    console.log('[Calendar Create] Command:', command);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 15000,
      env: { ...process.env, GOG_ACCOUNT: 'russelopenclaw@gmail.com', GOG_KEYRING_BACKEND: 'file', GOG_KEYRING_PASSWORD: 'gogkeyring-8488Carter!' }
    });

    if (stderr && !stderr.includes('Color output')) {
      console.error('[gog calendar create] stderr:', stderr);
    }

    const event = JSON.parse(stdout);

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        summary: event.summary,
        start: event.start,
        end: event.end,
        htmlLink: event.htmlLink,
      },
    });
  } catch (error) {
    console.error('[API /calendar/events POST] Error:', error);

    return NextResponse.json(
      {
        error: true,
        errorMessage: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
