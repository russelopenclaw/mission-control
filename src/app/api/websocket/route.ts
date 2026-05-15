import { NextRequest, NextResponse } from 'next/server';

/**
 * WebSocket/Server-Sent Events (SSE) endpoint for real-time dashboard updates
 * 
 * This route supports:
 * 1. HTTP GET for SSE (Server-Sent Events) - browser-compatible real-time updates
 * 2. WebSocket upgrade for Node.js environments (future enhancement)
 * 
 * The endpoint broadcasts:
 * - Agent status changes (working/idle)
 * - Task updates (status, progress, completion)
 * - Subagent activity
 * 
 * Clients can subscribe to specific channels:
 * - `agents` - Agent status updates
 * - `tasks` - Task updates
 * - `subagents` - Subagent activity
 * - `all` - All updates
 */

// In-memory subscribers (for single-server deployments)
// In production, use Redis pub/sub for multi-server scale
type Subscription = {
  send: (data: string) => void;
  close: () => void;
};

const subscribers: Map<string, Subscription> = new Map();

/**
 * Publish message to all subscribers
 */
function publish(channel: string, data: any): void {
  const message = JSON.stringify({
    channel,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const [subChannel, sub] of subscribers) {
    // Send to all subscribers or specific channel subscribers
    if (subChannel === 'all' || subChannel === channel) {
      try {
        sub.send(message);
      } catch (error) {
        console.error(`Failed to send to subscriber ${subChannel}:`, error);
      }
    }
  }
}

/**
 * SSE Handler - Server-Sent Events for browser clients
 */
export async function GET(request: NextRequest) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  };

  // Create a custom response
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  
  // Create close controller
  let closed = false;
  const closeController = {
    close: () => {
      if (!closed) {
        closed = true;
        writer.close().catch(() => {});
      }
    },
  };

  // Extract channel from query params
  const url = new URL(request.url);
  const channel = url.searchParams.get('channel') || 'all';

  // Create subscription
  const subscription: Subscription = {
    send: (data: string) => {
      if (!closed) {
        writer.write(new TextEncoder().encode(`data: ${data}\n\n`));
      }
    },
    close: () => closeController.close(),
  };

  // Register subscriber
  subscribers.set(channel, subscription);

  // Send initial connection message
  writer.write(new TextEncoder().encode(
    `event: connect\n data: {"message":"Connected","channel":"${channel}"}\n\n`
  ));

  // Send heartbeat every 15 seconds to keep connection alive
  const heartbeatId = setInterval(() => {
    if (!closed) {
      writer.write(new TextEncoder().encode(`event: heartbeat\n data: {"timestamp":"${new Date().toISOString()}"}\n\n`));
    }
  }, 15000);

  // Clean up on client disconnect
  const abortController = new AbortController();
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatId);
    closeController.close();
    subscribers.delete(channel);
  });

  return new Response(readable, { headers });
}

/**
 * POST handler for sending updates from server to clients
 * Example: When an agent updates status, this endpoint broadcasts to all subscribers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, data } = body;

    if (!channel || !data) {
      return NextResponse.json(
        { error: 'channel and data are required' },
        { status: 400 }
      );
    }

    // Broadcast to subscribers
    publish(channel, data);

    return NextResponse.json({ success: true, channel, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[WebSocket POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to publish message', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Subscribe function - used by internal APIs to broadcast updates
 */
export function subscribeToAgentUpdates(callback: (data: any) => void): () => void {
  const channel = 'agents';
  
  const subscription: Subscription = {
    send: (data: string) => {
      try {
        const parsed = JSON.parse(data);
        callback(parsed.data);
      } catch (error) {
        console.error('Failed to parse subscription data:', error);
      }
    },
    close: () => {
      subscribers.delete(channel);
    },
  };

  subscribers.set(channel, subscription);

  // Return unsubscribe function
  return () => {
    subscribers.delete(channel);
  };
}

export function subscribeToTaskUpdates(callback: (data: any) => void): () => void {
  const channel = 'tasks';
  
  const subscription: Subscription = {
    send: (data: string) => {
      try {
        const parsed = JSON.parse(data);
        callback(parsed.data);
      } catch (error) {
        console.error('Failed to parse subscription data:', error);
      }
    },
    close: () => {
      subscribers.delete(channel);
    },
  };

  subscribers.set(channel, subscription);

  return () => {
    subscribers.delete(channel);
  };
}

/**
 * Broadcast helper functions for internal use
 */
export async function broadcastAgentStatus(agentName: string, status: any) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8765'}/api/websocket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'agents',
      data: { agent: agentName, ...status },
    }),
  });
}

export async function broadcastTaskUpdate(taskId: string, taskData: any) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8765'}/api/websocket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'tasks',
      data: { taskId, ...taskData },
    }),
  });
}

export async function broadcastSubagentActivity(subagentId: string, activity: any) {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8765'}/api/websocket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'subagents',
      data: { subagentId, ...activity },
    }),
  });
}
