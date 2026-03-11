# Kanban Tasks Board

A Kanban-style task management interface for Mission Control.

## Features

##> ⚠️ **DEPRECATED**: This document references old JSON files.
> PostgreSQL is now the source of truth. See AGENTS.md for current practices.

# Kanban Board Columns
- **Backlog** - Unassigned tasks, ideas, things to discuss, keep-sake items
- **In Progress** - Currently being worked on
- **Review** - Tasks waiting for Kevin's personal review
- **Done** - Completed tasks

### Task Cards
Each task displays:
- Title
- Assignee (Kevin/Alfred/Jeeves)
- Priority (low/medium/high)
- Created date
- Move buttons (← Move / Move →) to navigate between columns

### Live Activity Sidebar
- Real-time agent status (updates every 30 seconds)
- Shows agent name, current task, status (working/idle), last activity
- Pulls from `/workspace/alfred-hub/agent-status.json`

### Task Management
- Add new tasks via the "+ Add Task" button
- Modal form with title, description, assignee, priority, and column selection
- Move tasks between columns with arrow buttons
- Click on a task to view details in a modal

## File Structure

```
mission-control/
├── src/
│   ├── app/
│   │   ├── tasks/
│   │   │   └── page.tsx          # Main tasks page
│   │   └── api/
│   │       ├── tasks/
│   │       │   └── route.ts      # CRUD API for tasks
│   │       └── status/
│   │           └── route.ts      # Agent status API
│   └── components/
│       ├── kanban/
│       │   └── KanbanBoard.tsx   # Kanban board components
│       └── widgets/
│           └── LiveActivitySidebar.tsx  # Live agent activity
└── docs/
    └── KANBAN.md                   # This file
```

## Data Storage

### Tasks: `/workspace/kanban/tasks.json`
```json
{
  "tasks": [
    {
      "id": "unique-id",
      "title": "Task title",
      "column": "backlog|in-progress|review|done",
      "assignee": "kevin|alfred|jeeves",
      "priority": "low|medium|high",
      "createdAt": "ISO timestamp",
      "description": "optional details"
    }
  ],
  "agents": {
    "alfred": { 
      "status": "working", 
      "currentTask": "...", 
      "lastActivity": "..." 
    }
  }
}
```

### Agent Status: `/workspace/alfred-hub/agent-status.json`
```json
{
  "agents": {
    "alfred": {
      "status": "working",
      "currentTask": "Task description",
      "lastActivity": "ISO timestamp"
    }
  }
}
```

## API Endpoints

### GET /api/tasks
Returns all tasks and agent data.

### POST /api/tasks
Creates a new task.
```json
{
  "title": "Task title",
  "column": "backlog",
  "assignee": "alfred",
  "priority": "high",
  "description": "Optional description"
}
```

### PUT /api/tasks
Updates an existing task.
```json
{
  "id": "task-id",
  "column": "in-progress"  // or other fields
}
```

### DELETE /api/tasks?id=task-id
Deletes a task.

### GET /api/status
Returns agent status from `agent-status.json`.

## Heartbeat Integration

To monitor for new tasks assigned to Alfred during heartbeat checks:

1. Check the `tasks` array in `/workspace/kanban/tasks.json`
2. Look for tasks with `assignee: "alfred"` and `column: "backlog"` or `column: "in-progress"`
3. Update `agent-status.json` with current activity
4. The UI will automatically refresh every 30 seconds

## Navigation

Access the Kanban board at:
- URL: `http://localhost:8765/tasks`
- Navigation: Click "📋 Tasks" in the top navigation bar

## Styling

The Kanban board uses the existing Mission Control design system:
- Dark theme (`#0d0d0f`, `#151518` backgrounds)
- Purple accent color (`#5e6ad2`)
- Priority colors: high (red), medium (yellow), low (green)
- Assignee badges: Kevin (purple), Alfred (green), Jeeves (orange)

## Future Enhancements

- [ ] Drag-and-drop between columns (currently using move buttons)
- [ ] Task filtering by assignee or priority
- [ ] Search functionality
- [ ] Task comments/notes
- [ ] Due dates
- [ ] WebSocket support for real-time updates
