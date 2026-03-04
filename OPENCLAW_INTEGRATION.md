# OpenClaw Integration Guide

## Quick Start

To enable automatic agent status updates and subagent tracking in OpenClaw, add the following to your session initialization or main agent loop.

## Option 1: Direct Integration (Recommended)

Add this to your OpenClaw main session or agent initialization:

```javascript
// In your main agent loop or session start
const path = require('path');
const statusHook = require(path.resolve(__dirname, '../tools/agent-status-hook.js'));

// When receiving a message from Kevin
async function handleMessage(messages, session) {
  // Update Alfred status to "working"
  await statusHook.onMessageReceived(messages, session);
  
  // ... process the message ...
  
  // When done processing
  await statusHook.onTaskComplete(taskId);
}

// When spawning a subagent
async function spawnSubagent(label, task) {
  const runId = generateRunId(); // Your run ID generation
  
  // Register the subagent
  await statusHook.onSubagentSpawn(runId, label, task);
  
  // ... spawn and run subagent ...
  
  // When subagent completes
  await statusHook.onSubagentComplete(runId);
}
```

## Option 2: OpenClaw Hooks Configuration

If your OpenClaw version supports hooks, add to `openclaw.json`:

```json
{
  "hooks": {
    "session": {
      "onMessageReceived": {
        "script": "./tools/agent-status-hook.js",
        "function": "onMessageReceived"
      },
      "onTaskComplete": {
        "script": "./tools/agent-status-hook.js",
        "function": "onTaskComplete"
      }
    },
    "subagents": {
      "onSpawn": {
        "script": "./tools/agent-status-hook.js",
        "function": "onSubagentSpawn"
      },
      "onComplete": {
        "script": "./tools/agent-status-hook.js",
        "function": "onSubagentComplete"
      }
    }
  }
}
```

## Option 3: Manual Calls

If you prefer explicit control, call the utilities directly:

```javascript
const { updateAgentStatus, updateSubagentStatus } = require('./mission-control/src/lib/agent-status.ts');

// Update Alfred status
await updateAgentStatus('alfred', 'working', 'Building new feature...');

// When done
await updateAgentStatus('alfred', 'idle', 'Task completed');

// Register subagent
await updateSubagentStatus('run-123', 'running', 'Processing documents...', 'Jeeves - Docs');

// Complete subagent
await updateSubagentStatus('run-123', 'done', 'Task completed', 'Jeeves - Docs');
```

## Heartbeat Integration

Add heartbeat checks to your periodic maintenance routine:

```javascript
const heartbeat = require('./mission-control/src/lib/heartbeat.ts');

// In your heartbeat loop (recommended: every 30 minutes)
async function runHeartbeatCheck() {
  if (await heartbeat.shouldRunHeartbeat(30)) {
    const result = await heartbeat.runHeartbeat();
    console.log('Heartbeat complete:', result);
  }
}

// Run every 30 minutes
setInterval(runHeartbeatCheck, 30 * 60 * 1000);
```

## Subagent Spawning Example

Here's a complete example of spawning a subagent with automatic tracking:

```javascript
const statusHook = require('../tools/agent-status-hook.js');

async function spawnTrackedSubagent(task, label) {
  // Generate unique run ID
  const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Register subagent before spawning
  await statusHook.onSubagentSpawn(runId, label, task);
  
  try {
    // Spawn your subagent here
    const result = await yourSubagentSystem.spawn({
      id: runId,
      task: task,
      label: label
    });
    
    // Mark as complete
    await statusHook.onSubagentComplete(runId);
    
    return result;
  } catch (error) {
    // Mark as error
    await statusHook.updateSubagentStatus(runId, 'error', `Failed: ${error.message}`, label);
    throw error;
  }
}
```

## Task Tracking Example

Link messages to tasks automatically:

```javascript
const taskTracking = require('./mission-control/src/lib/task-tracking.ts');

// When receiving a message
async function processMessage(message, agent) {
  // Try to auto-link to existing task
  const { linkedTask, updated } = await taskTracking.autoLinkMessageToTask(message, agent);
  
  if (linkedTask) {
    console.log(`Linked to task: ${linkedTask.title}`);
    
    if (updated) {
      console.log('Task marked as in-progress');
    }
    
    // Update agent status with task info
    await statusHook.updateAgentStatus(agent, 'working', linkedTask.title);
  } else {
    // No matching task, use message as task
    await statusHook.updateAgentStatus(agent, 'working', message.substring(0, 50));
  }
}
```

## Testing the Integration

### Test 1: Check API Endpoints

```bash
# Start your Next.js dev server
cd mission-control
npm run dev

# In another terminal, test the endpoints
curl http://localhost:3000/api/status
curl http://localhost:3000/api/subagents
curl http://localhost:3000/api/tasks
```

### Test 2: Trigger Status Update

```javascript
// In Node.js or OpenClaw session
const statusHook = require('../tools/agent-status-hook.js');

await statusHook.updateAgentStatus('alfred', 'working', 'Test task');

// Check the file
cat ../kanban/tasks.json
```

### Test 3: Spawn Test Subagent

```javascript
await statusHook.onSubagentSpawn('test-123', 'Test Agent', 'Testing the system');

// Check subagents file
cat ../kanban/subagents.json

// Complete it
await statusHook.onSubagentComplete('test-123');

// Check again - should be in "recent" now
cat ../kanban/subagents.json
```

## File Locations

All data files are relative to `/home/kevin/.openclaw/workspace`:

- **Agent Status:** `kanban/tasks.json` (in `agents` field)
- **Subagent Status:** `kanban/subagents.json`
- **Heartbeat State:** `mission-control/memory/heartbeat-state.json`

## Monitoring

### Check Active Subagents

```bash
curl http://localhost:3000/api/subagents | jq '.active'
```

### Check Agent Status

```bash
curl http://localhost:3000/api/status | jq '.agents.alfred'
```

### View Task History

```bash
cat kanban/tasks.json | jq '.tasks[] | select(.history) | {title, history}'
```

## Troubleshooting

### Status Not Updating

1. Check file permissions on `kanban/tasks.json`
2. Verify the hook is being called (add console.log)
3. Check for errors in OpenClaw logs

### Subagents Not Appearing

1. Verify `kanban/subagents.json` exists
2. Check that `onSubagentSpawn` is called before subagent starts
3. Confirm the runId is unique

### UI Not Showing Updates

1. Check browser console for errors
2. Verify API endpoints return data: `curl http://localhost:3000/api/subagents`
3. Check polling interval (should be 10s in sidebar)

## Performance Notes

- File I/O is minimal (JSON files, < 100KB typically)
- Polling interval is 10 seconds for subagents (adjustable)
- Heartbeat runs every 30 minutes by default
- Recent subagents are limited to 10 entries
- Old completed subagents are cleaned up after 24 hours

## Security Considerations

- Data files are stored in workspace (not public)
- API endpoints don't require authentication (add if needed)
- Subagent runIds should be unguessable (use UUIDs in production)
- Consider adding rate limiting to API endpoints

## Next Steps

After integration:

1. Test with a real subagent spawn
2. Monitor for 24 hours to verify heartbeat works
3. Check Mission Control UI shows live updates
4. Review and adjust polling intervals if needed
5. Consider adding WebSocket for real-time updates (future enhancement)
