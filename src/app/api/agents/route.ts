import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT * FROM agents ORDER BY name');
    
    const agents = result.rows.map((row: any) => ({
      name: row.name,
      status: row.status,
      current_task: row.current_task,
      last_activity: row.last_activity,
    }));
    
    return NextResponse.json({ agents });
    
  } catch (error) {
    console.error('[API /agents] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
