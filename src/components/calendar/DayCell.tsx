'use client';

import React from 'react';
import { MonthDay } from '@/lib/calendar/utils';

interface DayCellProps {
  day: MonthDay;
  onClick?: (day: MonthDay) => void;
}

export default function DayCell({ day, onClick }: DayCellProps) {
  const eventCount = day.events.length;
  
  // Get unique event types for dots
  const eventTypes = Array.from(new Set(day.events.map(e => e.type)));
  
  return (
    <div
      onClick={() => onClick?.(day)}
      className={`min-h-[100px] p-2 border border-[#27272a] cursor-pointer transition-colors hover:bg-[#1f1f22] ${
        !day.isCurrentMonth ? 'bg-[#0d0d0f]/50' : 'bg-[#0d0d0f]'
      } ${day.isToday ? 'ring-1 ring-[#5e6ad2]' : ''}`}
    >
      {/* Day Number */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-sm font-medium ${
            day.isToday
              ? 'text-[#5e6ad2] font-semibold'
              : day.isCurrentMonth
              ? 'text-[#e8e8e8]'
              : 'text-[#525252]'
          }`}
        >
          {day.dayNumber}
        </span>
        {eventCount > 0 && (
          <span className="text-[10px] text-[#525252]">{eventCount}</span>
        )}
      </div>
      
      {/* Event Dots - Color-coded by type */}
      {eventCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {day.events.slice(0, 4).map((event, index) => {
            let colorClass = 'bg-[#6b7280]'; // Default gray
            if (event.type === 'meeting') colorClass = 'bg-[#3b82f6]'; // Blue
            if (event.type === 'personal') colorClass = 'bg-[#22c55e]'; // Green
            if (event.type === 'reminder') colorClass = 'bg-[#eab308]'; // Yellow
            
            return (
              <div
                key={`${event.id}-${index}`}
                className={`w-2 h-2 rounded-full ${colorClass}`}
                title={`${event.type}: ${event.title}`}
              />
            );
          })}
          {eventCount > 4 && (
            <span className="text-[9px] text-[#525252]">+{eventCount - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}
