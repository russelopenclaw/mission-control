import { NextResponse } from 'next/server';
import { 
  getEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  getReminders,
  createReminder,
  updateReminder
} from '@/lib/calendar/events';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const type = searchParams.get('type');
    
    let [events, reminders] = await Promise.all([
      getEvents(),
      getReminders()
    ]);
    
    // Filter by date if provided
    if (date) {
      events = events.filter(e => e.date === date);
      reminders = reminders.filter(r => r.date === date);
    }
    
    // Filter by type if provided
    if (type) {
      events = events.filter(e => e.type === type);
    }
    
    return NextResponse.json({ events, reminders });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, ...eventData } = body;
    
    // Support both calendar format and brain event handler format
    if (type === 'reminder') {
      const reminder = await createReminder(eventData);
      return NextResponse.json({ success: true, reminder }, { status: 201 });
    } else {
      // Map brain event handler fields to calendar format
      // Support both formats:
      // 1. Brain format: { start: "2026-03-03T14:00:00.000Z", end: "2026-03-03T15:00:00.000Z" }
      // 2. Calendar format: { date: "2026-03-03", startTime: "14:00", endTime: "15:00" }
      const calendarEvent = {
        title: eventData.title || 'Untitled Event',
        date: eventData.date || (eventData.start ? eventData.start.split('T')[0] : new Date().toISOString().split('T')[0]),
        startTime: eventData.startTime || (eventData.start ? eventData.start.split('T')[1]?.substring(0, 5) : undefined),
        endTime: eventData.endTime || (eventData.end ? eventData.end.split('T')[1]?.substring(0, 5) : undefined),
        type: eventData.type || 'personal',
        description: eventData.description || '',
        location: eventData.location
      };
      
      const event = await createEvent(calendarEvent);
      return NextResponse.json({ success: true, event }, { status: 201 });
    }
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, type, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }
    
    if (type === 'reminder') {
      const reminder = await updateReminder(id, updates);
      if (!reminder) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, reminder });
    } else {
      const event = await updateEvent(id, updates);
      if (!event) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, event });
    }
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// Note: Reminder deletion handled in /api/calendar/reminders route
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }
    
    // Reminder deletion should use the dedicated reminders endpoint
    if (type === 'reminder') {
      return NextResponse.json(
        { error: 'Use DELETE /api/calendar/reminders for reminder deletion' },
        { status: 400 }
      );
    }
    
    const deleted = await deleteEvent(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
