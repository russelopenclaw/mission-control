-- Calendar PostgreSQL Migration Schema
-- Created: 2026-03-06
-- Purpose: Migrate calendar data from JSON files to PostgreSQL

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  type VARCHAR(20) CHECK (type IN ('personal', 'meeting', 'reminder', 'cron')),
  description TEXT,
  location VARCHAR(500),
  recurring_rule VARCHAR(500), -- RRULE string (e.g., "FREQ=MONTHLY;BYSETPOS=3;BYDAY=TU")
  recurring_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  due_date DATE NOT NULL,
  due_time TIME,
  recurring_rule VARCHAR(500), -- RRULE string
  recurring_until DATE,
  completed BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON calendar_events(type);
CREATE INDEX IF NOT EXISTS idx_events_recurring ON calendar_events(recurring_rule) WHERE recurring_rule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(completed) WHERE completed = FALSE;
CREATE INDEX IF NOT EXISTS idx_reminders_recurring ON reminders(recurring_rule) WHERE recurring_rule IS NOT NULL;

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE calendar_events IS 'Calendar events: meetings, personal events, reminders, and cron jobs';
COMMENT ON COLUMN calendar_events.recurring_rule IS 'iCalendar RRULE format (RFC 5545)';
COMMENT ON TABLE reminders IS 'User reminders with optional recurrence and notification tracking';
