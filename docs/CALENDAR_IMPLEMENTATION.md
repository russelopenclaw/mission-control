# Calendar Page Implementation

## Overview
The Calendar page for Mission Control provides a comprehensive view of Kevin's schedule with two main sections:
- **5-Day Rolling View**: Shows today through 4 days ahead with all events
- **Monthly Calendar View**: Traditional calendar grid showing personal events only

## Features

### Section 1: 5-Day Rolling View (Top - 40%)
- Shows 5 consecutive days starting from today
- Each day displays:
  - Date header with "Today" indicator
  - All events sorted by time (all-day first, then timed)
  - Event types: Personal (blue), Meetings (purple), Reminders (yellow), Cron jobs (green)
  - Empty state message when no events

### Section 2: Monthly Calendar View (Bottom - 60%)
- Traditional 5-week calendar grid
- Current month with navigation to adjacent months
- Event dots/badges on days with events
- Click any day to expand and see details
- Filters to show ONLY personal events (meetings, personal events, reminders)
- **Excludes**: Agent cron jobs and automated tasks

### Sidebar: Fixed Agent Activity (Right)
- Reuses `LiveActivitySidebar` component from Tasks page
- Shows Alfred + all subagents
- Live status updates every 10 seconds
- Full viewport height, fixed/sticky on right

## Data Sources

### Local Files (`/workspace/calendar/`)
- `events.json` - Personal events and meetings
- `reminders.json` - User reminders
- `cron.json` - Agent cron jobs and scheduled tasks

### Integration with Kanban
- Tasks with due dates can be pulled from `/workspace/kanban/tasks.json`

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/calendar/5day` | GET | Get next 5 days with all events |
| `/api/calendar/month` | GET | Get monthly calendar data |
| `/api/calendar/events` | GET | CRUD operations for events |
| `/api/calendar/events` | POST | Create new event |
| `/api/calendar/reminders` | GET | Get reminders |
| `/api/calendar/reminders` | POST | Create reminder |
| `/api/calendar/reminders` | DELETE | Delete reminder |

## File Structure

```
/mission-control/
  src/
    app/
      calendar/
        page.tsx                    # Main calendar page
      api/
        calendar/
          5day/route.ts             # 5-day view API
          month/route.ts            # Monthly view API
          events/route.ts           # Events CRUD
          reminders/route.ts        # Reminders API
    components/
      calendar/
        FiveDayView.tsx             # Top 5-day rolling view
        MonthlyView.tsx             # Traditional calendar grid
        DayCell.tsx                 # Individual day component
        EventList.tsx               # List of events for a day
        EventModal.tsx              # Event creation/details modal
    lib/
      calendar/
        events.ts                   # Event management functions
        utils.ts                    # Date helpers, formatting
```

## Styling

Follows Linear-style dark theme:
- Background: `#151518`, `#0d0d0f`
- Borders: `#27272a`
- Text: `#e8e8e8` (primary), `#a1a1a1` (secondary), `#888888` (muted)
- Accent: `#5e6ad2` (purple-blue)

### Event Color Coding
- 🔵 **Personal events**: `bg-[#3b82f6]` (blue)
- 🟡 **Reminders**: `bg-[#eab308]` (yellow)
- 🟢 **Cron jobs**: `bg-[#22c55e]` (green)
- 🟣 **Meetings**: `bg-[#a855f7]` (purple)

## Sample Data

The calendar includes sample data for testing:
- 6 personal events across the next 5 days
- 6 reminders with various recurrence patterns
- 5 cron jobs for agent tasks

## Usage

1. Navigate to `/calendar` in Mission Control
2. View upcoming 5 days at the top
3. Scroll down to see monthly view
4. Click any event for details
5. Click "+ Add Event" to create new events
6. Click any day in monthly view to expand events

## Future Enhancements

- [ ] Google Calendar integration
- [ ] Drag-and-drop event editing
- [ ] Event recurrence management
- [ ] Integration with kanban tasks (due dates)
- [ ] Calendar export (iCal)
- [ ] Reminder notifications integration
- [ ] Cron job editing UI
