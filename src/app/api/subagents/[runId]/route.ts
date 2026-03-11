import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const POOL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'mission_control',
  user: 'alfred',
  password: process.env.DB_PASSWORD || 'AlfredDB2026Secure'
};

function calculateRuntime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  
  if (diffHours < 24) {
    return `${diffHours}h ${remainingMins}m`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  
  return `${diffDays}d ${remainingHours}h ${remainingMins}m`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const { runId } = await params;
    
    const result = await pool.query(
      'SELECT run_id, label, task, status, runtime, started_at, completed_at FROM subagents WHERE run_id = $1',
      [runId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Subagent not found' }, { status: 404 });
    }
    
    const row = result.rows[0];
    return NextResponse.json({
      runId: row.run_id,
      label: row.label,
      task: row.task,
      status: row.status,
      runtime: row.runtime || calculateRuntime(row.started_at),
      startedAt: row.started_at,
      completedAt: row.completed_at
    });
  } catch (error) {
    console.error('Failed to get subagent status:', error);
    return NextResponse.json({ error: 'Subagent not found' }, { status: 404 });
  } finally {
    await pool.end();
  }
}
