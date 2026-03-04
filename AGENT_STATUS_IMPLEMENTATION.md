# Agent Status & Subagent Tracking Implementation

## Overview

This implementation provides automatic agent status updates, subagent tracking, and integration with Mission Control's UI.

## Files Created/Modified

### 1. `/tools/agent-status-hook.js` (NEW)
Session hook for OpenClaw that automatically updates agent status:
- `onMessageReceived()` - Sets Alfred to "working" when Kevin sends a message
- `onTaskComplete()` - Sets Alfred to "idle" when task completes
- `onSubagentSpawn()` - Registers new subagents
- `onSubagentComplete()` - Marks subagents as done
- `updateAgentStatus()` - Core status update function
- `updateSubagentStatus()` - Subagent status management

### 2. `/src/lib/agent-status.ts` (ENHANCED)
TypeScript utilities for agent status management:
- `updateAgentStatus(agent, status, currentTask)` - Update main agent status
- `readAgentStatus(agent?)` - Read agent status (single or all)
- `updateSubagentStatus(runId, status, task, label)` - Update subagent status
- `getSubagentStatus(runId)` - Get specific subagent
- `getAllSubagents()` - Get all subagents (active + recent)
- `calculateRuntime(startedAt)` - Calculate runtime duration

### 3. `/src/app/api/subagents/route.ts` (NEW)
API endpoint to list all subagents:
- **GET /api/subagents** - Returns `{ active: [], recent: [] }`
- Calculates runtime for each subagent

### 4. `/src/app/api/subagents/[runId]/route.ts` (NEW)
API endpoint for specific subagent details:
- **GET /api/subagents/:runId** - Returns subagent details or 404

### 5. `/src/lib/subagents.ts` (NEW)
Subagent monitoring utilities:
- `getAllSubagents()` - Get all with calculated runtime
- `getActiveSubagentsCount()` - Count active subagents
- `getSubagentByRunId(runId)` - Get specific subagent
- `getSubagentsByStatus(status)` - Filter by status
- `getTotalActiveTokens()` - Sum tokens from active subagents
- `getAverageRuntime()` - Calculate average runtime
- `cleanupOldSubagents()` - Remove completed >24h old
- `initializeSubagentsFile()` - Create file if missing

### 6. `/src/lib/heartbeat.ts` (NEW)
Heartbeat integration for periodic maintenance:
- `refreshAgentStatuses()` - Reset stale agents to idle
- `updateActivityTimestamps()` - Update lastActivity times
- `runHeartbeat()` - Full maintenance routine
- `shouldRunHeartbeat(intervalMinutes)` - Check if should run
- `initializeHeartbeat()` - Initialize state file

### 7. `/src/lib/task-tracking.ts` (NEW)
Task tracking and auto-linking utilities:
- `findTasksByKeyword(keyword)` - Search tasks by keyword
- `getTasksByAssignee(assignee)` - Get tasks for agent
- `autoLinkMessageToTask(message, agent)` - Auto-link messages to tasks
- `getInProgressTasks(agent)` - Get agent's active tasks
- `markTaskInProgress(taskId, agent, subagentRunId?)` - Update task status
- `markTaskDone(taskId, note?)` - Mark task complete
- `getTaskHistory(taskId)` - Get task history

### 8. `/src/components/widgets/LiveActivitySidebar.tsx` (ENHANCED)
Enhanced sidebar with subagent tracking:
- Shows Main Agent section at top
- Shows all Active Subagents below
- Shows Recent (completed) subagents
- Polls every 10 seconds (was 30s)
- Click to expand subagent details
- Color-coded status indicators
- Live runtime counter

### 9. `/src/components/widgets/DashboardStats.tsx` (ENHANCED)
Updated stats widget:
- Added "Active Subagents" count
- Added "Tasks Today" count
- Now fetches from `/api/subagents` endpoint
- Refreshes every 30 seconds

### 10. `/src/app/api/tasks/route.ts` (ENHANCED)
Enhanced task API:
- Subtask tracking (`parentTaskId`, `subtasks[]`)
- Agent assignment tracking (`assignee`, `assignedAt`)
- Task history (`history[]` with timestamps)
- Subagent linking (`subagentRunId`)

### 11. `/src/app/page.tsx` (ENHANCED)
Home page now includes Live Activity sidebar on right panel

### 12. `/kanban/subagents.json` (NEW)
Data file for subagent tracking:
```json
{
  "active": [],
  "recent": []
}
```

## Data Structures

### Agent Status (in `kanban/tasks.json`)
```json
{
  "agents": {
    "alfred": {
      "status": "working",
      "currentTask": "Building documentation...",
      "lastActivity": "2026-03-03T17:10:51.676Z"
    }
  }
}
```

### Subagent Status (in `kanban/subagents.json`)
```json
{
  "active": [
    {
      "runId": "abc123",
      "label": "Jeeves - Docs Page",
      "task": "Building documentation browser...",
      "status": "running",
      "runtime": "46m",
      "totalTokens": 125000,
      "startedAt": "2026-03-03T11:35:00Z",
      "lastUpdated": "2026-03-03T12:21:00Z"
    }
  ],
  "recent": [...]
}
```

### Task History (in `kanban/tasks.json`)
```json
{
  "id": "task-1",
  "title": "Example task",
  "assignee": "alfred",
  "subagentRunId": "abc123",
  "history": [
    {
      "status": "backlog",
      "timestamp": "2026-03-03T10:00:00Z",
      "note": "Task created"
    },
    {
      "status": "in-progress",
      "timestamp": "2026-03-03T10:05:00Z",
      "note": "Agent alfred started working"
    }
  ]
}
```

## Integration with OpenClaw

### Session Hook Configuration

To enable automatic status updates, configure OpenClaw to run the session hook:

1. **Option 1: Manual Hook Calls**
   Add to your OpenClaw session initialization:
   ```javascript
   const statusHook = require('./tools/agent-status-hook.js');
   
   // On message receive
   await statusHook.onMessageReceived(messages, session);
   
   // On task complete
   await statusHook.onTaskComplete(taskId);
   
   // On subagent spawn
   await statusHook.onSubagentSpawn(runId, label, task);
   
   // On subagent complete
   await statusHook.onSubagentComplete(runId);
   ```

2. **Option 2: OpenClaw Config**
   Add to `openclaw.json` or relevant config:
   ```json
   {
     "hooks": {
       "onMessageReceived": "./tools/agent-status-hook.js",
       "onTaskComplete": "./tools/agent-status-hook.js"
     }
   }
   ```

### Heartbeat Integration

Run heartbeat checks periodically (recommended every 30 minutes):

```javascript
const heartbeat = require('./src/lib/heartbeat.ts');

// In your heartbeat routine
if (await heartbeat.shouldRunHeartbeat(30)) {
  await heartbeat.runHeartbeat();
}
```

## UI Features

### Live Activity Sidebar

**Location:** Right panel on Home and Tasks pages

**Sections:**
- **Main Agent** - Alfred's current status
- **Subagents** - All active subagents with:
  - Colored status dot (green=working, blue=running, gray=idle/done)
  - Runtime counter (updates live)
  - Task description (truncated, full on hover)
  - Click to expand for details (tokens, start time, run ID)
- **Recent** - Last 3 completed subagents

**Polling:** Every 10 seconds

### Dashboard Stats

**New Metrics:**
- Active Agents (working status)
- Active Subagents (running tasks)
- Tasks Today (created in last 24h)
- In Progress (tasks in "in-progress" column)
- Urgent Items (high priority, not done)

## Testing

### Test 1: Spawn a Subagent
```bash
# Subagent should appear in Live Activity sidebar immediately
# Check: GET /api/subagents
```

### Test 2: Send Message to Alfred
```bash
# Status should change to "working"
# Check: GET /api/status
```

### Test 3: Complete Task
```bash
# Status should update to "idle"
# Check: GET /api/status
```

### Test 4: Wait for Heartbeat
```bash
# After 1 hour of inactivity, status should reset to idle
# Check: GET /api/status
```

### Test 5: Check Dashboard
```bash
# Should show active subagent count
# Visit: /dashboard or /
```

## API Endpoints

### Get All Subagents
```
GET /api/subagents
Response: { active: [], recent: [] }
```

### Get Specific Subagent
```
GET /api/subagents/:runId
Response: { runId, label, task, status, runtime, ... }
```

### Get Agent Status
```
GET /api/status
Response: { agents: { alfred: {...}, jeeves: {...} } }
```

### Get Tasks
```
GET /api/tasks
Response: { tasks: [], agents: {} }
```

### Update Task
```
PUT /api/tasks
Body: { id, column?, title?, assignee?, subagentRunId?, note? }
```

## Future Enhancements

1. **WebSocket Integration** - Real-time updates instead of polling
2. **Subagent Token Tracking** - Update `totalTokens` during runtime
3. **Task Dependencies** - Block subtasks until parent completes
4. **Agent Performance Metrics** - Track completion rates, avg runtime
5. **Notification System** - Alert when subagents fail or timeout
6. **Historical Analytics** - Charts showing agent activity over time

## Notes

- All file paths are relative to `/home/kevin/.openclaw/workspace`
- Data files are stored in `kanban/` directory
- UI components poll at 10-30 second intervals
- Heartbeat runs every 30 minutes by default
- Subagent runtime is calculated on-the-fly (not stored)
