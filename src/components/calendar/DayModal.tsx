'use client';

import React from 'react';
import { MonthDay, CalendarEvent, formatTime } from '@/lib/calendar/utils';
import { getEventColor } from '@/lib/calendar/utils';

interface DayModalProps {
  day: MonthDay;
  onClose: () => void;
}

export default function DayModal({ day, onClose }: DayModalProps) {
  const fullDate = new Date(day.date + 'T00:00:00');
  const dateStr = fullDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-[#151518] border border-[#27272a] rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            {day.isToday && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#5e6ad2]/20 text-[#5e6ad2] font-medium">
                TODAY
              </span>
            )}
            <h2 className="text-lg font-semibold text-white">
              {dateStr}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4">
          {day.events.length > 0 ? (
            <div className="space-y-3">
              {day.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="w-12 h-12 text-[#27272a] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-[#525252]">No events scheduled for this day</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a]">
          <button
            onClick={onClose}
            className="w-full bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event }: { event: CalendarEvent }) {
  const colorClass = getEventColor(event.type);
  const bgColorClass = colorClass.replace('bg-[', 'bg-').replace(']', '/10');
  
  const typeLabels: Record<string, string> = {
    meeting: 'Meeting',
    personal: 'Personal',
    reminder: 'Reminder'
  };

  const typeStyles: Record<string, string> = {
    meeting: 'bg-[#3b82f6]/20 text-[#93c5fd] border-[#3b82f6]/30',
    personal: 'bg-[#22c55e]/20 text-[#86efac] border-[#22c55e]/30',
    reminder: 'bg-[#eab308]/20 text-[#fde68a] border-[#eab308]/30'
  };

  return (
    <div className={`group p-3 rounded-md border ${typeStyles[event.type] || 'border-[#27272a] bg-[#0d0d0f]'}`}>
      {/* Type Badge */}
      <div className="mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded border ${typeStyles[event.type] || 'border-[#27272a]'}`}>
          {typeLabels[event.type] || event.type}
        </span>
      </div>
      
      {/* Title */}
      <h4 className="text-sm font-medium text-[#e8e8e8] mb-2">
        {event.title}
      </h4>
      
      {/* Details */}
      <div className="space-y-1 text-xs text-[#a1a1a1]">
        {event.startTime && (
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[#525252]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {formatTime(event.startTime)}
              {event.endTime && <span className="text-[#525252]"> — {formatTime(event.endTime)}</span>}
            </span>
          </div>
        )}
        
        {event.location && (
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[#525252]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        )}
        
        {event.description && (
          <p className="text-[#525252] mt-2 text-xs leading-relaxed">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}
