# WebSocket Real-Time Sync Implementation

## Overview

This document describes the WebSocket (SSE-based) real-time sync implementation for Alfred Hub (mission-control dashboard).

## Architecture

### Server-Side Components

#### `/api/websocket/route.ts`
- **Type**: Next.js API Route with Server-Sent Events (SSE)
- **Endpoints**:
  - `GET /api/websocket` - SSE stream for real-time updates
  - `POST /api/websocket` - Publish messages to subscribers
  
**Supported Channels**:
- `agents` - Agent status updates (working/idle)
- `tasks` - Task state changes
- `subagents` - Subagent activity
- `all` - All updates

**Features**:
- Automatic reconnection with exponential backoff
- Heartbeat maintenance (every 15 seconds)
- Channel-based subscriptions

#### `/api/dashboard/heatmap/route.ts`
- Returns agent activity heatmap data
- Supports period filters: 24h, 7days, 30days, 90days
- Supports granularity: hourly, daily
- Returns intensity levels (0-5) for visualization

#### `/api/dashboard/velocity/route.ts`
- Returns task velocity tracking data
- Tracks completed tasks per day/week
- Calculates velocity trends (comparing current vs previous period)
- Includes average completion times

### Client-Side Components

#### `src/lib/websocket/useWebSocket.ts`
- **Hook**: `useWebSocket(options)`
- Features:
  - Automatic connection establishment
  - Reconnection with exponential backoff
  - Channel-specific subscriptions
  - WebSocket event handling

**Exports**:
- `useWebSocket(options)` - Main hook for WebSocket integration
- `useAgentStatus()` - Auto-updating agent status hook
- `useTaskUpdates()` - Auto-updating task updates hook
- `useAutoRefreshAgentStatus()` - Auto-refresh with polling fallback

**Options**:
```typescript
{
  channels: string[];           // Channels to subscribe to
  onConnect?: () => void;       // Connection callback
  onDisconnect?: () => void;    // Disconnection callback
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  reconnect?: boolean;          // Auto-reconnect enabled
  maxReconnectAttempts?: number; // Max reconnection attempts
  reconnectDelay?: number;      // Base delay for reconnection
}
```

#### `src/components/widgets/LiveActivitySidebar.tsx`
- Updated with WebSocket integration
- WebSocket connection indicator in header
- Real-time updates without page refresh
- Falls back to polling if WebSocket unavailable

**Features**:
- WebSocket status indicator (green = connected, yellow = polling)
- Real-time agent status updates
- Real-time subagent activity updates
- Automatic reconnection with exponential backoff

#### `src/components/widgets/AgentActivityHeatmap.tsx`
- Visualizes agent activity across time
- Color-coded intensity levels
- Supports hourly and daily granularity
- Displays working/idle/done status breakdown

**Usage**:
```tsx
<AgentActivityHeatmap 
  period="7days" 
  granularity="hourly" 
/>
```

#### `src/components/widgets/TaskVelocityTracker.tsx`
- Tracks task completion velocity over time
- Shows daily task counts with trend indicators
- Displays velocity trend (percentage change)
- Shows average completion times

**Usage**:
```tsx
<TaskVelocityTracker 
  period="7days" 
  granularity="daily" 
/>
```

## Client Integration Example

### Basic WebSocket Connection

```tsx
import { useWebSocket } from '@/lib/websocket/useWebSocket';

function MyComponent() {
  const { connected, lastMessage, sendMessage } = useWebSocket({
    channels: ['agents', 'tasks'],
    onConnect: () => console.log('Connected!'),
    onMessage: (message) => {
      if (message.channel === 'agents') {
        console.log('Agent update:', message.data);
      }
    }
  });

  return (
    <div>
      <p>WebSocket: {connected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={() => sendMessage('agents', { status: 'ping' })}>
        Send Message
      </button>
    </div>
  );
}
```

### Agent Status Subscription

```tsx
import { useAgentStatus } from '@/lib/websocket/useWebSocket';

function AgentStatusWidget() {
  const { agentStatus, connected } = useAgentStatus();
  
  return (
    <div>
      {Object.entries(agentStatus).map(([agent, status]) => (
        <div key={agent}>
          {agent}: {status.status}
        </div>
      ))}
    </div>
  );
}
```

## Broadcasting Updates

### From Server-Side APIs

```typescript
import { broadcastAgentStatus, broadcastTaskUpdate } from '@/app/api/websocket/route';

// Broadcast agent status change
await broadcastAgentStatus('alfred', {
  status: 'working',
  currentTask: 'Processing task-123'
});

// Broadcast task update
await broadcastTaskUpdate('task-123', {
  status: 'completed',
  completedAt: new Date().toISOString()
});
```

### Direct API Call

```typescript
await fetch('/api/websocket', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    channel: 'agents',
    data: { agent: 'alfred', status: 'idle' }
  })
});
```

## Configuration

### Environment Variables

```env
# Base URL for broadcasting (optional, defaults to localhost:8765)
NEXT_PUBLIC_BASE_URL=http://localhost:8765
```

### Connection Behavior

- **Automatic reconnection**: Enabled by default
- **Max reconnection attempts**: 5 (configurable)
- **Exponential backoff**: Base delay × 2^attempt
- **Heartbeat interval**: 15 seconds
- **Polling fallback**: Every 30 seconds when WebSocket unavailable

## Testing

### Start Development Server

```bash
cd mission-control
npm run dev
```

The server will be available at `http://localhost:8765`

### Test WebSocket Connection

```bash
# Using curl for SSE
curl -N http://localhost:8765/api/websocket?channel=all

# Test broadcast
curl -X POST http://localhost:8765/api/websocket \
  -H "Content-Type: application/json" \
  -d '{"channel": "agents", "data": {"agent": "test"}}'
```

### Browser Console Test

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8765/api/websocket?channel=all');

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};

// Manually test broadcast
fetch('/api/websocket', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    channel: 'agents',
    data: { agent: 'test-agent', status: 'working' }
  })
});
```

## Performance Considerations

1. **In-Memory Subscribers**: Current implementation stores subscribers in memory. For production:
   - Use Redis pub/sub for multi-server deployments
   - Implement subscriber cleanup on server restart
   - Add connection limits and rate limiting

2. **Memory Management**: 
   - Clean up subscriptions when clients disconnect
   - Implement connection timeouts
   - Monitor subscriber count metrics

3. **Scalability**:
   - SSE scales well for few channels (< 1000 concurrent connections per server)
   - Use Redis for high-scale deployments
   - Consider WebSocket for bidirectional communication needs

## Future Enhancements

1. **Bidirectional WebSocket**: Replace SSE with full WebSocket for client-to-server messages
2. **Redis Pub/Sub**: Support multi-server deployments
3. **Message Persistence**: Store messages for offline clients
4. **Message Compression**: Use gzip for large payloads
5. ** Authentication**: Add auth token validation for subscriptions
6. **Metrics**: Add WebSocket connection/throughput metrics
7. **Rate Limiting**: Prevent spamming via rate limiting

## Troubleshooting

### WebSocket Not Connecting

1. Check browser console for CORS errors
2. Verify `/api/websocket` route is accessible
3. Check network tab for SSE stream (should be "pending")
4. Ensure server is running on expected port

### Connection Drops Frequently

1. Increase reconnection attempts
2. Check server logs for errors
3. Verify network stability
4. Review heartbeat configuration

### Data Not Updating

1. Verify broadcast calls are using correct channel
2. Check client is subscribed to correct channels
3. Review network tab for SSE messages
4. Ensure `broadcast*` functions are being called after state changes

## Rollback

To revert WebSocket implementation:

1. Remove WebSocket dependencies from components:
   - Remove `useWebSocket` hook from `LiveActivitySidebar.tsx`
   - Remove WebSocket hooks from other components

2. Restore polling intervals:
   - Update agent status polling to 30 seconds
   - Update subagent polling to 30 seconds

3. Remove WebSocket files:
   - `src/app/api/websocket/route.ts`
   - `src/lib/websocket/useWebSocket.ts`

4. Revert changes to:
   - `src/components/widgets/LiveActivitySidebar.tsx`
   - `src/app/page.tsx`
