'use client';

import React, { useState, useEffect } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  description?: string;
  recurrence?: string;
}

export default function CalendarWidget() {
  const today = new Date();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/calendar/events');
        const data = await res.json();
        // Get today's events and upcoming (next 5 days)
        const todayStr = today.toISOString().split('T')[0];
        const filtered = (data.events || [])
          .filter((e: CalendarEvent) => {
            const d = e.date || (e.start ? e.start.split('T')[0] : null);
            return d && d >= todayStr;
          })
          .slice(0, 5); // Show next 5 events
        setEvents(filtered);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setLoading(false);
      }
    };
    
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [today]);

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getEventTime = (event: CalendarEvent) => {
    if (event.startTime) return formatTime(event.startTime);
    if (event.start) {
      const time = event.start.split('T')[1]?.substring(0, 5);
      return formatTime(time);
    }
    return 'All day';
  };

  const getTypeIcon = (event: CalendarEvent) => {
    if (event.recurrence) return '🔁';
    if (event.type === 'personal') return '👤';
    if (event.title.toLowerCase().includes('meeting')) return '👥';
    if (event.title.toLowerCase().includes('deadline')) return '⚠️';
    if (event.title.toLowerCase().includes('reminder')) return '🔔';
    return '📅';
  };

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
      <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Upcoming Events</h2>
      {loading ? (
        <div className="text-center py-8">
          <div className="text-xs text-[#888888]">Loading events...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">📅</div>
          <div className="text-xs text-[#888888]">No upcoming events</div>
        </div>
      ) : (
        <>
          <div className="text-center mb-4">
            <div className="text-xs text-[#888888]">
              {events.length} event{events.length !== 1 ? 's' : ''} scheduled
            </div>
          </div>
          
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-2.5 flex items-center gap-3">
                <span className="text-xl">{getTypeIcon(event)}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#e8e8e8]">{event.title}</div>
                  <div className="text-xs text-[#888888]">
                    {formatDate(event.date || event.start || '')} • {getEventTime(event)}
                    {event.recurrence && <span className="ml-1 text-[#888888]">(recurring)</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      <a 
        href="/calendar" 
        className="block mt-3 w-full bg-[#1a1a1f] hover:bg-[#27272a] border border-[#27272a] text-[#888888] hover:text-white text-sm font-medium py-2 rounded-md transition-colors text-center"
      >
        View Full Calendar
      </a>
    </div>
  );
}
