import { NextResponse } from 'next/server';
import { getEvents, getReminders, filterPersonalEvents } from '@/lib/calendar/events';
import { getMonthDays, getCurrentMonth, getMonthName } from '@/lib/calendar/utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    
    const { year, month } = yearParam && monthParam
      ? { year: parseInt(yearParam, 10), month: parseInt(monthParam, 10) }
      : getCurrentMonth();
    
    const weeks = getMonthDays(year, month);
    const [events, reminders] = await Promise.all([
      getEvents(),
      getReminders()
    ]);
    
    // Filter for personal events only (meetings, personal events, reminders)
    // Exclude cron jobs and automated tasks
    const personalEvents = filterPersonalEvents(events);
    
    // Map events to days
    weeks.forEach(week => {
      week.forEach(day => {
        const dayEvents: CalendarEvent[] = [];
        
        // Add personal events and meetings
        const dayPersonalEvents = personalEvents.filter(e => e.date === day.date);
        dayEvents.push(...dayPersonalEvents);
        
        // Add reminders (shown on monthly view)
        const dayReminders = reminders.filter(r => r.date === day.date);
        dayEvents.push(...dayReminders.map(r => ({
          id: r.id,
          title: r.title,
          date: r.date,
          type: 'reminder' as const,
          description: r.recurring ? `Recurring: ${r.recurring}` : undefined,
          startTime: r.time
        })));
        
        // Sort events by time (all-day first, then by start time)
        day.events = dayEvents.sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return -1;
          if (!b.startTime) return 1;
          return a.startTime.localeCompare(b.startTime);
        });
      });
    });
    
    return NextResponse.json({
      monthName: getMonthName(month),
      year,
      month,
      weeks
    });
  } catch (error) {
    console.error('Failed to fetch monthly calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: 'meeting' | 'personal' | 'reminder' | 'cron';
  description?: string;
  location?: string;
}
