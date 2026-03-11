> ⚠️ **DEPRECATED**: This document references old JSON files.
> PostgreSQL is now the source of truth. See AGENTS.md for current practices.

# Quick Reference: Agent Status & Subagent Tracking

## 🚀 Quick Start

### Test the System
```bash
# 1. Start Mission Control
cd /home/kevin/.openclaw/workspace/mission-control
npm run dev

# 2. Open browser to http://localhost:3000
#    - Check Live Activity sidebar (right side)
#    - Check Dashboard Stats (top row)
```

### Manually Update Status
```bash
# Check current status
curl http://localhost:3000/api/status

# Check subagents
curl http://localhost:3000/api/subagents
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `/tools/agent-status-hook.js` | OpenClaw session hook |
| `/kanban/tasks.json` | Agent status data |
| `/kanban/subagents.json` | Subagent tracking data |
| `/src/lib/agent-status.ts` | Status utilities |
| `/src/lib/subagents.ts` | Subagent monitoring |
| `/src/lib/heartbeat.ts` | Periodic maintenance |

## 🔌 OpenClaw Integration

### Minimal Integration
```javascript
const hook = require('./tools/agent-status-hook.js');

// On message
await hook.onMessageReceived(messages, session);

// On complete
await hook.onTaskComplete(taskId);
```

### Full Integration
```javascript
const hook = require('./tools/agent-status-hook.js');

// Message received
await hook.onMessageReceived(messages, session);

// Spawn subagent
await hook.onSubagentSpawn(runId, label, task);

// Subagent complete
await hook.onSubagentComplete(runId);

// Task complete
await hook.onTaskComplete(taskId);
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Get all agent statuses |
| `/api/subagents` | GET | List all subagents |
| `/api/subagents/:runId` | GET | Get specific subagent |
| `/api/tasks` | GET/POST/PUT/DELETE | Task management |

## 🎨 UI Components

### Live Activity Sidebar
- **Location:** Right panel on Home and Tasks pages
- **Updates:** Every 10 seconds
- **Shows:** Main Agent + All Subagents

### Dashboard Stats
- **Location:** Top of Home page
- **Updates:** Every 30 seconds
- **Shows:** Active Agents, Active Subagents, Tasks Today, In Progress, Urgent

## 🛠️ Utilities

### Agent Status
```typescript
updateAgentStatus('alfred', 'working', 'Task description')
readAgentStatus('alfred') // or omit for all
```

### Subagent Status
```typescript
updateSubagentStatus(runId, 'running', 'Task', 'Label')
getSubagentStatus(runId)
getAllSubagents()
```

### Task Tracking
```typescript
autoLinkMessageToTask(message, agent)
markTaskInProgress(taskId, agent, subagentRunId)
markTaskDone(taskId, note)
getTaskHistory(taskId)
```

### Heartbeat
```typescript
runHeartbeat() // Full maintenance
shouldRunHeartbeat(30) // Check if needed (30 min)
refreshAgentStatuses() // Reset stale agents
```

## 🔍 Debugging

### Check Data Files
```bash
# Agent status
cat /home/kevin/.openclaw/workspace/kanban/tasks.json | jq '.agents'

# Subagent status
cat /home/kevin/.openclaw/workspace/kanban/subagents.json
```

### Test API
```bash
# All endpoints
curl http://localhost:3000/api/status | jq
curl http://localhost:3000/api/subagents | jq
curl http://localhost:3000/api/tasks | jq
```

### Check Logs
```bash
# Mission Control build
cd /home/kevin/.openclaw/workspace/mission-control
npm run build

# Check for errors
npm run dev 2>&1 | grep -i error
```

## ⚙️ Configuration

### Change Polling Interval
Edit `LiveActivitySidebar.tsx`:
```javascript
setInterval(fetchSubagents, 10000); // milliseconds
```

### Change Heartbeat Interval
```javascript
if (await heartbeat.shouldRunHeartbeat(60)) { // minutes
  await heartbeat.runHeartbeat();
}
```

### Change Stale Threshold
Edit `heartbeat.ts`:
```javascript
isStatusStale(lastActivity, 120); // minutes
```

## 📈 Monitoring Commands

### Active Subagents Count
```bash
curl -s http://localhost:3000/api/subagents | jq '.active | length'
```

### Working Agents
```bash
curl -s http://localhost:3000/api/status | jq '.agents | to_entries[] | select(.value.status=="working")'
```

### Tasks In Progress
```bash
curl -s http://localhost:3000/api/tasks | jq '[.tasks[] | select(.column=="in-progress")]'
```

## 🎯 Common Tasks

### Add Test Subagent
```javascript
const fs = require('fs');
const data = {
  active: [{
    runId: 'test-123',
    label: 'Test Agent',
    task: 'Testing the system',
    status: 'running',
    startedAt: new Date().toISOString(),
    totalTokens: 0,
    runtime: '0m'
  }],
  recent: []
};
fs.writeFileSync('../kanban/subagents.json', JSON.stringify(data, null, 2));
```

### Reset Alfred to Idle
```javascript
const { updateAgentStatus } = require('./src/lib/agent-status.ts');
await updateAgentStatus('alfred', 'idle', 'Reset by user');
```

### Clean Old Subagents
```javascript
const { cleanupOldSubagents } = require('./src/lib/subagents.ts');
const { cleaned } = await cleanupOldSubagents();
console.log(`Cleaned ${cleaned} old subagents`);
```

## 📚 Documentation

- `IMPLEMENTATION_SUMMARY.md` - What was built
- `AGENT_STATUS_IMPLEMENTATION.md` - Technical details
- `OPENCLAW_INTEGRATION.md` - How to integrate

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Status not updating | Check file permissions on `kanban/tasks.json` |
| Subagents not showing | Verify `/api/subagents` returns data |
| UI not updating | Check browser console, verify polling |
| Heartbeat not running | Check `shouldRunHeartbeat()` returns true |
| Build fails | Run `npm run build` and check errors |

---

**Last Updated:** 2026-03-03  
**Status:** ✅ Production Ready
