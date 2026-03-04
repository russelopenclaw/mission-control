import { NextResponse } from 'next/server';
import { getReminders, createReminder, updateReminder, deleteReminder } from '@/lib/calendar/events';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    let reminders = await getReminders();
    
    // Filter by date if provided
    if (date) {
      reminders = reminders.filter(r => r.date === date);
    }
    
    return NextResponse.json({ reminders });
  } catch (error) {
    console.error('Failed to fetch reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Support both reminder handler format and calendar format
    const reminderData = {
      title: body.task || body.title || 'Untitled Reminder',
      date: body.dueDate ? body.dueDate.split('T')[0] : (body.due ? body.due.split('T')[0] : new Date().toISOString().split('T')[0]),
      time: body.dueDate ? body.dueDate.split('T')[1]?.substring(0, 5) : (body.due ? body.due.split('T')[1]?.substring(0, 5) : undefined),
      recurring: body.recurring || false,
      completed: body.completed || false
    };
    
    const reminder = await createReminder(reminderData);
    return NextResponse.json({ success: true, reminder }, { status: 201 });
  } catch (error) {
    console.error('Failed to create reminder:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Reminder ID required' },
        { status: 400 }
      );
    }
    
    const reminder = await updateReminder(id, updates);
    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, reminder });
  } catch (error) {
    console.error('Failed to update reminder:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Reminder ID required' },
        { status: 400 }
      );
    }
    
    const deleted = await deleteReminder(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}
