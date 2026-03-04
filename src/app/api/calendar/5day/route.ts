import { NextResponse } from 'next/server';
import { getEvents, getReminders, getCronJobs } from '@/lib/calendar/events';
import { getRelativeDays, sortEventsByTime } from '@/lib/calendar/utils';

export async function GET() {
  try {
    const today = new Date();
    const days = getRelativeDays(today, 5);
    
    const [events, reminders, cronJobs] = await Promise.all([
      getEvents(),
      getReminders(),
      getCronJobs()
    ]);
    
    // Map events to their respective days
    days.forEach(day => {
      const dayEvents = [];
      
      // Add personal events and meetings
      const dayEventsData = events.filter(e => e.date === day.date);
      dayEvents.push(...dayEventsData.map(e => ({
        ...e,
        type: e.type as 'personal' | 'meeting'
      })));
      
      // Add reminders
      const dayReminders = reminders.filter(r => r.date === day.date);
      dayEvents.push(...dayReminders.map(r => ({
        id: r.id,
        title: r.title,
        date: r.date,
        startTime: r.time,
        type: 'reminder' as const,
        description: r.recurring ? `Recurring: ${r.recurring}` : undefined
      })));
      
      // Add cron jobs (scheduled tasks)
      // For display purposes, show cron jobs on days they would run
      // This is a simplified view - in production you'd calculate actual run times
      const dayCronJobs = cronJobs.filter(cron => {
        const cronDate = new Date(day.date);
        const dayOfWeek = cronDate.getDay();
        const dayOfMonth = cronDate.getDate();
        const month = cronDate.getMonth() + 1;
        
        // Simple parsing of cron schedule for display
        const parts = cron.schedule.split(' ');
        const cronDayOfWeek = parts[4];
        const cronDayOfMonth = parts[2];
        
        // If it's a daily job, show it
        if (parts[2] === '*' && parts[4] === '*') {
          return true;
        }
        
        // If it's a specific day of week
        if (cronDayOfWeek !== '*' && parseInt(cronDayOfWeek, 10) === dayOfWeek) {
          return true;
        }
        
        // If it's a specific day of month
        if (cronDayOfMonth !== '*' && parseInt(cronDayOfMonth, 10) === dayOfMonth) {
          return true;
        }
        
        return false;
      });
      
      dayEvents.push(...dayCronJobs.map(c => ({
        id: c.id,
        title: c.title,
        date: day.date,
        type: 'cron' as const,
        description: c.description,
        startTime: '00:00'
      })));
      
      day.events = sortEventsByTime(dayEvents);
    });
    
    return NextResponse.json({ days });
  } catch (error) {
    console.error('Failed to fetch 5-day calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
