import { NextResponse } from 'next/server';

// Placeholder calendar data (integrate with Google Calendar API later)
const today = new Date();

const events = [
  {
    id: '1',
    title: 'Morning Standup',
    start: new Date(today.setHours(9, 0, 0)).toISOString(),
    end: new Date(today.setHours(10, 0, 0)).toISOString(),
    type: 'meeting'
  },
  {
    id: '2',
    title: 'Code Review Session',
    start: new Date(today.setHours(14, 0, 0)).toISOString(),
    end: new Date(today.setHours(15, 0, 0)).toISOString(),
    location: 'Virtual',
    type: 'meeting'
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  
  // Placeholder - filter by date when calendar integration is added
  return NextResponse.json({ 
    events,
    date: date || new Date().toISOString().split('T')[0]
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  // Placeholder for creating events
  return NextResponse.json({ success: true, event: body });
}
