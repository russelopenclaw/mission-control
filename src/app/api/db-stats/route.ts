import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const stats = {
      tasks: await query('SELECT COUNT(*) FROM tasks'),
      agents: await query('SELECT COUNT(*) FROM agents'),
      subagents: await query('SELECT COUNT(*) FROM subagents'),
      history: await query('SELECT COUNT(*) FROM task_history'),
      recent: await query(`
        SELECT COUNT(*) FROM tasks 
        WHERE completed_at > NOW() - INTERVAL '24 hours'
      `)
    };
    
    return NextResponse.json({
      tasks: parseInt(stats.tasks.rows[0].count),
      agents: parseInt(stats.agents.rows[0].count),
      subagents: parseInt(stats.subagents.rows[0].count),
      taskHistory: parseInt(stats.history.rows[0].count),
      tasksCompletedToday: parseInt(stats.recent.rows[0].count),
      databaseHealth: 'healthy',
      lastMigration: '2026-03-05T15:00:00Z'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Database stats unavailable', details: (error as Error).message },
      { status: 500 }
    );
  }
}
