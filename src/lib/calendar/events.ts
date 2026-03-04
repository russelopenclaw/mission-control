import { promises as fs } from 'fs';
import path from 'path';

const CALENDAR_DIR = path.join('/home/kevin/.openclaw/workspace', 'calendar');
const EVENTS_FILE = path.join(CALENDAR_DIR, 'events.json');
const REMINDERS_FILE = path.join(CALENDAR_DIR, 'reminders.json');
const CRON_FILE = path.join(CALENDAR_DIR, 'cron.json');

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

export interface Reminder {
  id: string;
  title: string;
  date: string;
  time?: string;
  recurring: string | false;
  completed: boolean;
}

export interface CronJob {
  id: string;
  title: string;
  schedule: string;
  description: string;
  enabled: boolean;
}

export interface CalendarData {
  events: CalendarEvent[];
  reminders: Reminder[];
  cronJobs: CronJob[];
}

export async function getEvents(): Promise<CalendarEvent[]> {
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.events || [];
  } catch (error) {
    console.error('Failed to read events:', error);
    return [];
  }
}

export async function getReminders(): Promise<Reminder[]> {
  try {
    const data = await fs.readFile(REMINDERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const reminders = parsed.reminders || [];
    
    // Normalize reminder formats (support both old Brain handler format and new Calendar format)
    return reminders.map((r: any) => {
      // Check if it's the old Brain handler format (task, dueDate, notified)
      if (r.dueDate && r.task) {
        // Convert to Calendar format
        const dueDate = new Date(r.dueDate);
        return {
          id: r.id,
          title: r.task,
          date: dueDate.toISOString().split('T')[0],
          time: dueDate.getHours().toString().padStart(2, '0') + ':' + dueDate.getMinutes().toString().padStart(2, '0'),
          recurring: false,
          completed: false
        };
      }
      // Already in Calendar format
      return {
        id: r.id,
        title: r.title || 'Untitled',
        date: r.date,
        time: r.time,
        recurring: r.recurring || false,
        completed: r.completed || false
      };
    });
  } catch (error) {
    console.error('Failed to read reminders:', error);
    return [];
  }
}

export async function getCronJobs(): Promise<CronJob[]> {
  try {
    const data = await fs.readFile(CRON_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.cronJobs || [];
  } catch (error) {
    console.error('Failed to read cron jobs:', error);
    return [];
  }
}

export async function getAllCalendarData(): Promise<CalendarData> {
  const [events, reminders, cronJobs] = await Promise.all([
    getEvents(),
    getReminders(),
    getCronJobs()
  ]);

  return { events, reminders, cronJobs };
}

export async function createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const data = await getEvents();
  const newEvent: CalendarEvent = {
    ...event,
    id: `evt-${Date.now()}`
  };
  
  data.push(newEvent);
  await saveEvents(data);
  return newEvent;
}

export async function updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const data = await getEvents();
  const index = data.findIndex(e => e.id === id);
  
  if (index === -1) return null;
  
  data[index] = { ...data[index], ...updates };
  await saveEvents(data);
  return data[index];
}

export async function deleteEvent(id: string): Promise<boolean> {
  const data = await getEvents();
  const filtered = data.filter(e => e.id !== id);
  
  if (filtered.length === data.length) return false;
  
  await saveEvents(filtered);
  return true;
}

async function saveEvents(events: CalendarEvent[]): Promise<void> {
  const data = {
    events,
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  };
  await fs.writeFile(EVENTS_FILE, JSON.stringify(data, null, 2));
}

export async function deleteReminder(id: string): Promise<boolean> {
  const data = await getReminders();
  const filtered = data.filter(r => r.id !== id);
  
  if (filtered.length === data.length) return false;
  
  const reminderData = {
    reminders: filtered,
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  };
  await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminderData, null, 2));
  return true;
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
  const data = await getReminders();
  const index = data.findIndex(r => r.id === id);
  
  if (index === -1) return null;
  
  data[index] = { ...data[index], ...updates };
  
  const reminderData = {
    reminders: data,
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  };
  await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminderData, null, 2));
  return data[index];
}

export async function createReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
  const data = await getReminders();
  const newReminder: Reminder = {
    ...reminder,
    id: `rem-${Date.now()}`
  };
  
  data.push(newReminder);
  
  const reminderData = {
    reminders: data,
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
  };
  await fs.writeFile(REMINDERS_FILE, JSON.stringify(reminderData, null, 2));
  return newReminder;
}

/**
 * Filter events to show only personal events (meetings, personal, reminders)
 * Excludes cron jobs and automated tasks
 */
export function filterPersonalEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter(event => 
    event.type === 'meeting' || 
    event.type === 'personal' || 
    event.type === 'reminder'
  );
}

/**
 * Get only personal events from the calendar
 */
export async function getPersonalEvents(): Promise<CalendarEvent[]> {
  const events = await getEvents();
  return filterPersonalEvents(events);
}
