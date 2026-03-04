'use client';

import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '@/lib/calendar/utils';
import EventList from './EventList';

interface DayData {
  date: string;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  events: CalendarEvent[];
}

export default function FiveDayView() {
  const [days, setDays] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    fetchFiveDayData();
  }, []);

  const fetchFiveDayData = async () => {
    try {
      const res = await fetch('/api/calendar/5day');
      const data = await res.json();
      setDays(data.days || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch 5-day calendar:', error);
      setIsLoading(false);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-[#525252]">Loading calendar...</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 min-w-max pb-2">
        {days.map((day) => (
          <div
            key={day.date}
            className={`flex-shrink-0 w-[320px] rounded-lg border ${
              day.isToday
                ? 'bg-[#1a1a1e] border-[#5e6ad2]/40'
                : 'bg-[#0d0d0f] border-[#27272a]'
            }`}
          >
            {/* Day Header */}
            <div className={`p-4 border-b ${day.isToday ? 'border-[#5e6ad2]/20' : 'border-[#27272a]'}`}>
              <div className="mb-1">
                <h3 className="text-sm font-semibold text-[#e8e8e8]">
                  {day.dayName}
                </h3>
                {day.isToday && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5e6ad2]/20 text-[#5e6ad2] font-medium mt-1 inline-block">
                    TODAY
                  </span>
                )}
              </div>
              <p className="text-xs text-[#888888]">{day.dayNumber}</p>
              {day.events.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-[#525252]">{day.events.length} events</span>
                </div>
              )}
            </div>

            {/* Events List */}
            <div className="p-3 max-h-[280px] overflow-y-auto">
              {day.events.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs text-[#525252]">No events scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {day.events.map((event, index) => (
                    <EventChip
                      key={`${event.id}-${index}`}
                      event={event}
                      onClick={() => handleEventClick(event)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

// Event Chip/Badge Component
function EventChip({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const getColorClasses = (type: string) => {
    switch (type) {
      case 'meeting':
        return {
          bg: 'bg-[#3b82f6]/10',
          border: 'border-[#3b82f6]/30',
          dot: 'bg-[#3b82f6]',
          badge: 'bg-[#1e3a8a] text-[#93c5fd]'
        };
      case 'personal':
        return {
          bg: 'bg-[#22c55e]/10',
          border: 'border-[#22c55e]/30',
          dot: 'bg-[#22c55e]',
          badge: 'bg-[#064e3b] text-[#86efac]'
        };
      case 'reminder':
        return {
          bg: 'bg-[#eab308]/10',
          border: 'border-[#eab308]/30',
          dot: 'bg-[#eab308]',
          badge: 'bg-[#422006] text-[#fde68a]'
        };
      case 'cron':
        return {
          bg: 'bg-[#a855f7]/10',
          border: 'border-[#a855f7]/30',
          dot: 'bg-[#a855f7]',
          badge: 'bg-[#4c1d95] text-[#d8b4fe]'
        };
      default:
        return {
          bg: 'bg-[#6b7280]/10',
          border: 'border-[#6b7280]/30',
          dot: 'bg-[#6b7280]',
          badge: 'bg-[#1f2937] text-[#9ca3af]'
        };
    }
  };

  const colors = getColorClasses(event.type);

  return (
    <div
      onClick={onClick}
      className={`group flex items-start gap-2 p-2.5 rounded-md border ${colors.bg} ${colors.border} hover:border-opacity-50 transition-all cursor-pointer`}
    >
      {/* Color Dot */}
      <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`}></div>
      
      {/* Event Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-medium text-[#e8e8e8] truncate mb-1">
          {event.title}
        </h4>
        
        <div className="flex items-center gap-2 text-[10px] text-[#a1a1a1]">
          {event.startTime && (
            <span className="flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {event.startTime}
              {event.endTime && <span>- {event.endTime}</span>}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.location}
            </span>
          )}
        </div>
      </div>

      {/* Type Badge */}
      <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${colors.badge} flex-shrink-0`}>
        {event.type}
      </span>
    </div>
  );
}

// Event Details Modal
function EventModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#151518] border border-[#27272a] rounded-lg max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{event.title}</h2>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#888888] uppercase tracking-wide">Type</label>
            <p className="text-sm text-[#e8e8e8] capitalize">{event.type}</p>
          </div>
          
          <div>
            <label className="text-xs text-[#888888] uppercase tracking-wide">Date</label>
            <p className="text-sm text-[#e8e8e8]">{event.date}</p>
          </div>
          
          {event.startTime && (
            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wide">Time</label>
              <p className="text-sm text-[#e8e8e8]">
                {event.startTime} {event.endTime && `- ${event.endTime}`}
              </p>
            </div>
          )}
          
          {event.location && (
            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wide">Location</label>
              <p className="text-sm text-[#e8e8e8]">{event.location}</p>
            </div>
          )}
          
          {event.description && (
            <div>
              <label className="text-xs text-[#888888] uppercase tracking-wide">Description</label>
              <p className="text-sm text-[#a1a1a1] mt-1">{event.description}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
