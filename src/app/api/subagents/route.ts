import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let sql = 'SELECT * FROM subagents';
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      sql += ' WHERE status = $1';
    }
    
    sql += ' ORDER BY started_at DESC';
    
    const result = await query(sql, params);
    
    // Transform to match old JSON structure: {active: [], recent: []}
    const active: any[] = [];
    const recent: any[] = [];
    
    for (const row of result.rows) {
      const subagent = {
        runId: row.run_id,
        label: row.label,
        task: row.task,
        status: row.status,
        runtime: row.runtime,
        totalTokens: row.total_tokens || 0,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        lastUpdated: row.last_updated || row.started_at,
        note: row.note,
      };
      
      // Active = running/done without completedAt, Recent = completed
      if (row.status === 'running' || !row.completed_at) {
        active.push(subagent);
      } else {
        recent.push(subagent);
      }
    }
    
    // Keep only last 10 recent (match old behavior)
    const recentLimited = recent.slice(0, 10);
    
    return NextResponse.json({ active, recent: recentLimited });
    
  } catch (error) {
    console.error('[API /subagents] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
