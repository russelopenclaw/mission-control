/**
 * Calendar Data Migration Script
 * Migrates JSON calendar data to PostgreSQL
 * 
 * Usage: node db/migrations/migrate-calendar-data.js
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_DIR = '/home/kevin/.openclaw/workspace';
const CALENDAR_DIR = path.join(WORKSPACE_DIR, 'calendar');
const EVENTS_FILE = path.join(CALENDAR_DIR, 'events.json');
const REMINDERS_FILE = path.join(CALENDAR_DIR, 'reminders.json');

// PostgreSQL connection
const pool = new Pool({
  host: 'localhost',
  user: 'alfred',
  password: process.env.PGPASSWORD || 'AlfredDB2026Secure',
  database: 'mission_control',
  port: 5432
});

/**
 * Parse ISO date string to extract date and time components
 */
function parseISODateTime(isoString) {
  if (!isoString) return { date: null, time: null };
  
  const date = new Date(isoString);
  return {
    date: date.toISOString().split('T')[0],
    time: date.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
  };
}

/**
 * Normalize event data from various JSON formats to database format
 */
function normalizeEvent(event) {
  const normalized = {
    id: event.id,
    title: event.title || 'Untitled',
    date: null,
    start_time: null,
    end_time: null,
    type: event.type || 'personal',
    description: event.description || null,
    location: event.location || null,
    recurring_rule: event.recurrence || event.recurring_rule || null,
    recurring_until: null
  };

  // Handle different date/time formats
  if (event.start && event.end) {
    // ISO format: start/end as full timestamps
    const startParsed = parseISODateTime(event.start);
    const endParsed = parseISODateTime(event.end);
    normalized.date = startParsed.date;
    normalized.start_time = startParsed.time;
    normalized.end_time = endParsed.time;
  } else if (event.date) {
    // Simple format: date as string, startTime/endTime as HH:MM
    normalized.date = event.date;
    normalized.start_time = event.startTime || event.start_time || null;
    normalized.end_time = event.endTime || event.end_time || null;
  }

  return normalized;
}

/**
 * Normalize reminder data
 */
function normalizeReminder(reminder) {
  const normalized = {
    id: reminder.id,
    title: reminder.title || reminder.task || 'Untitled',
    due_date: null,
    due_time: null,
    recurring_rule: reminder.recurrence || reminder.recurring || null,
    recurring_until: null,
    completed: reminder.completed || false,
    notified_at: reminder.notified_at || null,
    description: reminder.description || null
  };

  // Handle old Brain handler format (dueDate as ISO)
  if (reminder.dueDate) {
    const parsed = parseISODateTime(reminder.dueDate);
    normalized.due_date = parsed.date;
    normalized.due_time = parsed.time;
  } else if (reminder.date) {
    // New Calendar format
    normalized.due_date = reminder.date;
    normalized.due_time = reminder.time || null;
  }

  // Normalize recurring boolean to RRULE string if needed
  if (normalized.recurring_rule === true) {
    // Old format had recurring: true, try to infer from description
    if (reminder.recurringDescription) {
      // Can't auto-convert description to RRULE, leave as null
      normalized.recurring_rule = null;
    }
  }

  return normalized;
}

/**
 * Migrate events to PostgreSQL
 */
async function migrateEvents(events) {
  const client = await pool.connect();
  
  try {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const rawEvent of events) {
      const event = normalizeEvent(rawEvent);
      
      if (!event.date) {
        console.log(`⚠️  Skipping event ${event.id}: no valid date`);
        skipped++;
        continue;
      }

      try {
        await client.query(
          `INSERT INTO calendar_events (
            id, title, date, start_time, end_time, type, description, location, recurring_rule, recurring_until
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            date = EXCLUDED.date,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            type = EXCLUDED.type,
            description = EXCLUDED.description,
            location = EXCLUDED.location,
            recurring_rule = EXCLUDED.recurring_rule,
            updated_at = NOW()`,
          [
            event.id,
            event.title,
            event.date,
            event.start_time,
            event.end_time,
            event.type,
            event.description,
            event.location,
            event.recurring_rule,
            event.recurring_until
          ]
        );
        inserted++;
      } catch (err) {
        console.error(`❌ Error inserting event ${event.id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n📅 Events Migration Summary:`);
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    
    return { inserted, skipped, errors };
  } finally {
    client.release();
  }
}

/**
 * Migrate reminders to PostgreSQL
 */
async function migrateReminders(reminders) {
  const client = await pool.connect();
  
  try {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const rawReminder of reminders) {
      const reminder = normalizeReminder(rawReminder);
      
      if (!reminder.due_date) {
        console.log(`⚠️  Skipping reminder ${reminder.id}: no valid due date`);
        skipped++;
        continue;
      }

      try {
        await client.query(
          `INSERT INTO reminders (
            id, title, due_date, due_time, recurring_rule, recurring_until, completed, notified_at, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            due_date = EXCLUDED.due_date,
            due_time = EXCLUDED.due_time,
            recurring_rule = EXCLUDED.recurring_rule,
            completed = EXCLUDED.completed,
            notified_at = EXCLUDED.notified_at,
            description = EXCLUDED.description,
            updated_at = NOW()`,
          [
            reminder.id,
            reminder.title,
            reminder.due_date,
            reminder.due_time,
            reminder.recurring_rule,
            reminder.recurring_until,
            reminder.completed,
            reminder.notified_at ? new Date(reminder.notified_at) : null,
            reminder.description
          ]
        );
        inserted++;
      } catch (err) {
        console.error(`❌ Error inserting reminder ${reminder.id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n⏰ Reminders Migration Summary:`);
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    
    return { inserted, skipped, errors };
  } finally {
    client.release();
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Calendar Data Migration to PostgreSQL\n');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL\n');

    // Read events.json
    console.log('📖 Reading events.json...');
    let eventsData;
    try {
      const eventsContent = await fs.readFile(EVENTS_FILE, 'utf-8');
      eventsData = JSON.parse(eventsContent);
      console.log(`   Found ${eventsData.events?.length || 0} events\n`);
    } catch (err) {
      console.log(`   ⚠️  events.json not found or invalid, skipping events\n`);
      eventsData = { events: [] };
    }

    // Read reminders.json
    console.log('📖 Reading reminders.json...');
    let remindersData;
    try {
      const remindersContent = await fs.readFile(REMINDERS_FILE, 'utf-8');
      remindersData = JSON.parse(remindersContent);
      console.log(`   Found ${remindersData.reminders?.length || 0} reminders\n`);
    } catch (err) {
      console.log(`   ⚠️  reminders.json not found or invalid, skipping reminders\n`);
      remindersData = { reminders: [] };
    }

    // Migrate events
    const eventsResult = await migrateEvents(eventsData.events || []);

    // Migrate reminders
    const remindersResult = await migrateReminders(remindersData.reminders || []);

    // Summary
    console.log('\n========================================');
    console.log('🎉 MIGRATION COMPLETED');
    console.log('========================================');
    console.log(`Total Events: ${eventsResult.inserted} inserted, ${eventsResult.skipped} skipped, ${eventsResult.errors} errors`);
    console.log(`Total Reminders: ${remindersResult.inserted} inserted, ${remindersResult.skipped} skipped, ${remindersResult.errors} errors`);
    console.log('========================================\n');

    // Verify counts
    const eventCount = await pool.query('SELECT COUNT(*) FROM calendar_events');
    const reminderCount = await pool.query('SELECT COUNT(*) FROM reminders');
    
    console.log('📊 Database Verification:');
    console.log(`   calendar_events: ${eventCount.rows[0].count} rows`);
    console.log(`   reminders: ${reminderCount.rows[0].count} rows`);
    console.log('');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrate();
