import { query } from '@/lib/db';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: 'personal' | 'meeting' | 'reminder' | 'cron';
  description?: string;
  location?: string;
  recurringRule?: string;
  recurringUntil?: string;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  time?: string;
  recurring: string | false;
  completed: boolean;
  description?: string;
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

/**
 * Convert database row to CalendarEvent interface
 */
function rowToCalendarEvent(row: any): CalendarEvent {
  // Format date as YYYY-MM-DD string (PostgreSQL DATE type may be converted to Date object)
  let dateString = row.date;
  if (row.date instanceof Date) {
    dateString = row.date.toISOString().split('T')[0];
  } else if (typeof row.date === 'string' && row.date.includes('T')) {
    // If it's already an ISO string, extract just the date part
    dateString = row.date.split('T')[0];
  }
  
  return {
    id: row.id,
    title: row.title,
    date: dateString,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    type: row.type as CalendarEvent['type'],
    description: row.description || undefined,
    location: row.location || undefined,
    recurringRule: row.recurring_rule || undefined,
    recurringUntil: row.recurring_until || undefined
  };
}

/**
 * Convert database row to Reminder interface
 */
function rowToReminder(row: any): Reminder {
  // Format due_date as YYYY-MM-DD string
  let dateString = row.due_date;
  if (row.due_date instanceof Date) {
    dateString = row.due_date.toISOString().split('T')[0];
  } else if (typeof row.due_date === 'string' && row.due_date.includes('T')) {
    dateString = row.due_date.split('T')[0];
  }
  
  return {
    id: row.id,
    title: row.title,
    date: dateString,
    time: row.due_time || undefined,
    recurring: row.recurring_rule || false,
    completed: row.completed,
    description: row.description || undefined
  };
}

/**
 * Get all calendar events from database
 */
export async function getEvents(): Promise<CalendarEvent[]> {
  try {
    const result = await query('SELECT * FROM calendar_events ORDER BY date, start_time');
    return result.rows.map(rowToCalendarEvent);
  } catch (error) {
    console.error('Failed to fetch events from database:', error);
    return [];
  }
}

/**
 * Get all reminders from database
 */
export async function getReminders(): Promise<Reminder[]> {
  try {
    const result = await query('SELECT * FROM reminders ORDER BY due_date, due_time');
    return result.rows.map(rowToReminder);
  } catch (error) {
    console.error('Failed to fetch reminders from database:', error);
    return [];
  }
}

/**
 * Get cron jobs (still using JSON file for now)
 * TODO: Migrate cron jobs to PostgreSQL
 */
export async function getCronJobs(): Promise<CronJob[]> {
  // Cron jobs not yet migrated to PostgreSQL
  return [];
}

/**
 * Get all calendar data
 */
export async function getAllCalendarData(): Promise<CalendarData> {
  const [events, reminders, cronJobs] = await Promise.all([
    getEvents(),
    getReminders(),
    getCronJobs()
  ]);

  return { events, reminders, cronJobs };
}

/**
 * Get events for a specific date range
 */
export async function getEventsByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  try {
    const result = await query(
      'SELECT * FROM calendar_events WHERE date >= $1 AND date <= $2 ORDER BY date, start_time',
      [startDate, endDate]
    );
    return result.rows.map(rowToCalendarEvent);
  } catch (error) {
    console.error('Failed to fetch events by date range:', error);
    return [];
  }
}

/**
 * Get events for a specific date
 */
export async function getEventsByDate(date: string): Promise<CalendarEvent[]> {
  try {
    const result = await query(
      'SELECT * FROM calendar_events WHERE date = $1 ORDER BY start_time',
      [date]
    );
    return result.rows.map(rowToCalendarEvent);
  } catch (error) {
    console.error('Failed to fetch events by date:', error);
    return [];
  }
}

/**
 * Get upcoming reminders (not completed)
 */
export async function getUpcomingReminders(daysAhead: number = 7): Promise<Reminder[]> {
  try {
    const result = await query(
      `SELECT * FROM reminders 
       WHERE completed = false 
       AND due_date >= CURRENT_DATE 
       AND due_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
       ORDER BY due_date, due_time`
    );
    return result.rows.map(rowToReminder);
  } catch (error) {
    console.error('Failed to fetch upcoming reminders:', error);
    return [];
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const id = `evt-${Date.now()}`;
  
  try {
    const result = await query(
      `INSERT INTO calendar_events (
        id, title, date, start_time, end_time, type, description, location, recurring_rule, recurring_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        event.title,
        event.date,
        event.startTime || null,
        event.endTime || null,
        event.type,
        event.description || null,
        event.location || null,
        event.recurringRule || null,
        event.recurringUntil || null
      ]
    );
    
    return rowToCalendarEvent(result.rows[0]);
  } catch (error) {
    console.error('Failed to create event:', error);
    throw error;
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  try {
    // Build dynamic update query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.date !== undefined) {
      fields.push(`date = $${paramIndex++}`);
      values.push(updates.date);
    }
    if (updates.startTime !== undefined) {
      fields.push(`start_time = $${paramIndex++}`);
      values.push(updates.startTime || null);
    }
    if (updates.endTime !== undefined) {
      fields.push(`end_time = $${paramIndex++}`);
      values.push(updates.endTime || null);
    }
    if (updates.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description || null);
    }
    if (updates.location !== undefined) {
      fields.push(`location = $${paramIndex++}`);
      values.push(updates.location || null);
    }
    if (updates.recurringRule !== undefined) {
      fields.push(`recurring_rule = $${paramIndex++}`);
      values.push(updates.recurringRule || null);
    }
    if (updates.recurringUntil !== undefined) {
      fields.push(`recurring_until = $${paramIndex++}`);
      values.push(updates.recurringUntil || null);
    }

    if (fields.length === 0) {
      // No updates provided, just return existing event
      const existing = await query('SELECT * FROM calendar_events WHERE id = $1', [id]);
      return existing.rows.length > 0 ? rowToCalendarEvent(existing.rows[0]) : null;
    }

    values.push(id);
    const result = await query(
      `UPDATE calendar_events SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? rowToCalendarEvent(result.rows[0]) : null;
  } catch (error) {
    console.error('Failed to update event:', error);
    throw error;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(id: string): Promise<boolean> {
  try {
    const result = await query('DELETE FROM calendar_events WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete event:', error);
    throw error;
  }
}

/**
 * Create a new reminder
 */
export async function createReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
  const id = `rem-${Date.now()}`;
  
  try {
    const result = await query(
      `INSERT INTO reminders (
        id, title, due_date, due_time, recurring_rule, completed, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        reminder.title,
        reminder.date,
        reminder.time || null,
        reminder.recurring || null,
        reminder.completed || false,
        reminder.description || null
      ]
    );
    
    return rowToReminder(result.rows[0]);
  } catch (error) {
    console.error('Failed to create reminder:', error);
    throw error;
  }
}

/**
 * Update an existing reminder
 */
export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.date !== undefined) {
      fields.push(`due_date = $${paramIndex++}`);
      values.push(updates.date);
    }
    if (updates.time !== undefined) {
      fields.push(`due_time = $${paramIndex++}`);
      values.push(updates.time || null);
    }
    if (updates.recurring !== undefined) {
      fields.push(`recurring_rule = $${paramIndex++}`);
      values.push(updates.recurring || null);
    }
    if (updates.completed !== undefined) {
      fields.push(`completed = $${paramIndex++}`);
      values.push(updates.completed);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description || null);
    }

    if (fields.length === 0) {
      const existing = await query('SELECT * FROM reminders WHERE id = $1', [id]);
      return existing.rows.length > 0 ? rowToReminder(existing.rows[0]) : null;
    }

    values.push(id);
    const result = await query(
      `UPDATE reminders SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? rowToReminder(result.rows[0]) : null;
  } catch (error) {
    console.error('Failed to update reminder:', error);
    throw error;
  }
}

/**
 * Delete a reminder
 */
export async function deleteReminder(id: string): Promise<boolean> {
  try {
    const result = await query('DELETE FROM reminders WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete reminder:', error);
    throw error;
  }
}

/**
 * Mark a reminder as completed
 */
export async function completeReminder(id: string): Promise<Reminder | null> {
  return updateReminder(id, { completed: true });
}

/**
 * Mark a reminder as notified
 */
export async function markReminderAsNotified(id: string): Promise<Reminder | null> {
  try {
    const result = await query(
      'UPDATE reminders SET notified_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows.length > 0 ? rowToReminder(result.rows[0]) : null;
  } catch (error) {
    console.error('Failed to mark reminder as notified:', error);
    throw error;
  }
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
  try {
    const result = await query(
      `SELECT * FROM calendar_events 
       WHERE type IN ('meeting', 'personal', 'reminder')
       ORDER BY date, start_time`
    );
    return result.rows.map(rowToCalendarEvent);
  } catch (error) {
    console.error('Failed to fetch personal events:', error);
    return [];
  }
}

/**
 * Get recurring events
 */
export async function getRecurringEvents(): Promise<CalendarEvent[]> {
  try {
    const result = await query(
      `SELECT * FROM calendar_events 
       WHERE recurring_rule IS NOT NULL 
       ORDER BY date`
    );
    return result.rows.map(rowToCalendarEvent);
  } catch (error) {
    console.error('Failed to fetch recurring events:', error);
    return [];
  }
}

/**
 * Search events by title
 */
export async function searchEvents(searchTerm: string): Promise<CalendarEvent[]> {
  try {
    const result = await query(
      `SELECT * FROM calendar_events 
       WHERE title ILIKE $1
       ORDER BY date, start_time`,
      [`%${searchTerm}%`]
    );
    return result.rows.map(rowToCalendarEvent);
  } catch (error) {
    console.error('Failed to search events:', error);
    return [];
  }
}
