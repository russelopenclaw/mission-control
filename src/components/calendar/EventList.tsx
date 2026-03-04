'use client';

import React from 'react';
import { CalendarEvent } from '@/lib/calendar/utils';
import { getEventColor, formatTime } from '@/lib/calendar/utils';

interface EventListProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  showEmptyState?: boolean;
}

export default function EventList({ events, onEventClick, showEmptyState = true }: EventListProps) {
  if (events.length === 0) {
    if (showEmptyState) {
      return (
        <div className="flex items-center justify-center py-8 text-center">
          <p className="text-sm text-[#525252]">No events scheduled</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => {
        const colorClass = getEventColor(event.type);
        const bgColorClass = colorClass.replace('bg-', 'bg-opacity-20 bg-');
        
        return (
          <div
            key={`${event.id}-${index}`}
            onClick={() => onEventClick?.(event)}
            className={`group flex items-start gap-3 p-3 rounded-md border border-[#27272a] hover:border-[#3b82f6]/50 transition-all cursor-pointer ${bgColorClass}`}
          >
            {/* Event Type Indicator */}
            <div className={`w-1 self-stretch min-h-[40px] rounded-full ${colorClass}`}></div>
            
            {/* Event Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-[#e8e8e8] truncate">
                  {event.title}
                </h4>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-[#a1a1a1]">
                {event.startTime && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(event.startTime)}
                    {event.endTime && <span> - {formatTime(event.endTime)}</span>}
                  </span>
                )}
                
                {event.location && !event.startTime && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </span>
                )}
              </div>
              
              {event.description && (
                <p className="text-xs text-[#525252] mt-1 line-clamp-1">
                  {event.description}
                </p>
              )}
            </div>
            
            {/* Event Type Badge */}
            <div className="flex-shrink-0">
              <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${
                event.type === 'personal' ? 'bg-[#1e3a8a] text-[#93c5fd]' :
                event.type === 'meeting' ? 'bg-[#4c1d95] text-[#d8b4fe]' :
                event.type === 'reminder' ? 'bg-[#422006] text-[#fde68a]' :
                'bg-[#064e3b] text-[#86efac]'
              }`}>
                {event.type}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
