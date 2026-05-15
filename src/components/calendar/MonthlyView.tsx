'use client';

import React, { useState, useEffect } from 'react';
import { MonthDay, CalendarEvent, getMonthName, getCurrentMonth } from '@/lib/calendar/utils';
import DayCell from './DayCell';
import DayModal from './DayModal';

export default function MonthlyView() {
  const now = getCurrentMonth();
  const [monthName, setMonthName] = useState('');
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.month);
  const [weeks, setWeeks] = useState<MonthDay[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<MonthDay | null>(null);

  useEffect(() => {
    fetchMonthlyData(year, month);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMonthlyData(year, month);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [year, month]);

  const fetchMonthlyData = async (y: number, m: number) => {
    try {
      // Get first and last day of the month
      const startDate = new Date(y, m, 1);
      const endDate = new Date(y, m + 1, 0);
      
      const res = await fetch(
        `/api/calendar/events?from=${startDate.toISOString()}&to=${endDate.toISOString()}`
      );
      const data = await res.json();
      
      // Build the month grid with Google Calendar events
      const monthName = getMonthName(m);
      setMonthName(monthName);
      setYear(y);
      setMonth(m);
      
      // Create weeks array
      const weeks: MonthDay[][] = [];
      const firstDayOfMonth = new Date(y, m, 1);
      const lastDayOfMonth = new Date(y, m + 1, 0);
      const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
      const totalDays = lastDayOfMonth.getDate();
      
      // Get events for this month
      const monthEvents = data.events || [];
      
      let currentDay = 1 - startingDayOfWeek; // Start from previous month if needed
      
      while (currentDay <= totalDays || weeks.length < 6) {
        const week: MonthDay[] = [];
        
        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(y, m, currentDay);
          const dateStr = dayDate.toLocaleDateString('en-CA'); // YYYY-MM-DD local date
          const isInCurrentMonth = currentDay >= 1 && currentDay <= totalDays;
          
          // Get events for this day - convert UTC to local date for comparison
          const dayEvents = monthEvents
            .filter((event: any) => {
              const eventStartDate = event.start ? new Date(event.start) : null;
              if (!eventStartDate) return false;
              const eventDateStr = eventStartDate.toLocaleDateString('en-CA');
              return eventDateStr === dateStr;
            })
            .map((event: any) => ({
              id: event.id,
              title: event.summary || 'Untitled',
              type: event.allDay ? 'personal' : (event.recurring ? 'personal' : 'meeting'),
              startTime: event.start && !event.allDay ? new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : undefined,
              endTime: event.end && !event.allDay ? new Date(event.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : undefined,
              allDay: event.allDay,
              location: event.location || undefined,
              description: event.description || undefined,
            }));
          
          week.push({
            date: dateStr,
            dayNumber: currentDay,
            isCurrentMonth: currentDay >= 1 && currentDay <= totalDays,
            isToday: dateStr === new Date().toISOString().split('T')[0],
            events: dayEvents,
          });
          
          currentDay++;
        }
        
        weeks.push(week);
        
        // Stop if we've passed the last day and completed a week
        if (currentDay > totalDays && week.every(d => !d.isCurrentMonth)) {
          break;
        }
      }
      
      setWeeks(weeks);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch monthly calendar:', error);
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleToday = () => {
    const now = getCurrentMonth();
    setYear(now.year);
    setMonth(now.month);
  };

  const handleDayClick = (day: MonthDay) => {
    setSelectedDay(day);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-[#525252]">Loading calendar...</span>
      </div>
    );
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {monthName} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-md hover:bg-[#27272a] transition-colors"
            title="Previous month"
          >
            <svg className="w-5 h-5 text-[#888888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleToday}
            className="text-sm text-[#5e6ad2] hover:text-[#5e6ad2]/80 transition-colors px-3 py-1.5"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-md hover:bg-[#27272a] transition-colors"
            title="Next month"
          >
            <svg className="w-5 h-5 text-[#888888]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-[#27272a] rounded-lg overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 bg-[#0d0d0f] border-b border-[#27272a]">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div
              key={i}
              className="py-2 text-center text-xs font-medium text-[#888888] sm:hidden"
            >
              {day}
            </div>
          ))}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
            <div
              key={i}
              className="py-2 text-center text-xs font-medium text-[#888888] uppercase tracking-wide hidden sm:block"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map((day) => (
                <DayCell
                  key={day.date}
                  day={day}
                  onClick={handleDayClick}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-[#888888]">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></div>
          <span className="text-[#a1a1a1]">Meeting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></div>
          <span className="text-[#a1a1a1]">Personal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
          <span className="text-[#a1a1a1]">Reminder</span>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDay && (
        <DayModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
