import { NextResponse } from 'next/server';
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
