import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM agents ORDER BY name');
    
    const agents: any = {};
    for (const agent of result.rows) {
      agents[agent.name] = {
        status: agent.status,
        currentTask: agent.current_task,
        lastActivity: agent.last_activity,
      };
    }
    
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[API /status] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, status, currentTask } = body;

    if (!agent || !status) {
      return NextResponse.json(
        { error: 'agent and status are required' },
        { status: 400 }
      );
    }

    // Update agent status in database
    await query(`
      INSERT INTO agents (name, status, current_task, last_activity)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (name) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        current_task = EXCLUDED.current_task,
        last_activity = NOW()
    `, [agent, status, currentTask || '']);

    // Broadcast to WebSocket subscribers
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8765';
      await fetch(`${baseUrl}/api/websocket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'agents',
          data: { agent, status, currentTask },
        }),
      });
    } catch (broadcastError) {
      console.error('Failed to broadcast agent status:', broadcastError);
      // Don't fail the request if broadcast fails
    }

    return NextResponse.json({ success: true, agent, status });
  } catch (error) {
    console.error('[API /status POST] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
