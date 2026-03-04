export interface DayEvent {
  date: string;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
  events: CalendarEvent[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: 'personal' | 'meeting' | 'reminder' | 'cron';
  description?: string;
  location?: string;
}

export interface MonthDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export interface MonthData {
  monthName: string;
  year: number;
  days: MonthDay[][];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getRelativeDays(start: Date, count: number): DayEvent[] {
  const days: DayEvent[] = [];
  const today = formatDate(new Date());
  
  for (let i = 0; i < count; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    const isToday = formatDate(date) === today;
    const dayName = DAY_NAMES[date.getDay()];
    const monthDay = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
    
    days.push({
      date: formatDate(date),
      dayName: isToday ? `${dayName}, ${monthDay} - Today` : `${dayName}, ${monthDay}`,
      dayNumber: monthDay,
      isToday,
      events: []
    });
  }
  
  return days;
}

export function getMonthDays(year: number, month: number): MonthDay[][] {
  const weeks: MonthDay[][] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Start from the Sunday of the week containing the first day
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  // End on the Saturday of the week containing the last day
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  
  const today = formatDate(new Date());
  let currentWeek: MonthDay[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const isCurrentMonth = currentDate.getMonth() === month;
    const dateStr = formatDate(currentDate);
    
    currentWeek.push({
      date: dateStr,
      dayNumber: currentDate.getDate(),
      isCurrentMonth,
      isToday: dateStr === today,
      events: []
    });
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return weeks;
}

export function getCurrentMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth()
  };
}

export function getMonthName(month: number): string {
  return MONTH_NAMES[month];
}

export function formatTime(time?: string): string {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getEventColor(type: string): string {
  switch (type) {
    case 'meeting':
      return 'bg-[#3b82f6]'; // Blue - Meetings
    case 'personal':
      return 'bg-[#22c55e]'; // Green - Personal events
    case 'reminder':
      return 'bg-[#eab308]'; // Yellow - Reminders
    case 'cron':
      return 'bg-[#a855f7]'; // Purple - Cron jobs/scheduled tasks
    default:
      return 'bg-[#6b7280]'; // Gray
  }
}

export function getEventDotColor(type: string): string {
  switch (type) {
    case 'meeting':
      return 'bg-[#3b82f6] text-[#93c5fd]'; // Blue
    case 'personal':
      return 'bg-[#22c55e] text-[#86efac]'; // Green
    case 'reminder':
      return 'bg-[#eab308] text-[#fde68a]'; // Yellow
    case 'cron':
      return 'bg-[#a855f7] text-[#d8b4fe]'; // Purple
    default:
      return 'bg-[#6b7280] text-[#9ca3af]';
  }
}

export function sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    // All-day events first
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return -1;
    if (!b.startTime) return 1;
    
    // Then by start time
    return a.startTime.localeCompare(b.startTime);
  });
}

export function getDayDescription(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (formatDate(date) === formatDate(today)) {
    return 'Today';
  } else if (formatDate(date) === formatDate(tomorrow)) {
    return 'Tomorrow';
  } else {
    return DAY_NAMES[date.getDay()];
  }
}
