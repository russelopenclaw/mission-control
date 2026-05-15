import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get recent activity
    const activityQuery = agent
      ? `SELECT id, agent_name, action, details, task_id, created_at 
         FROM activity_log WHERE agent_name = $1 
         ORDER BY created_at DESC LIMIT $2`
      : `SELECT id, agent_name, action, details, task_id, created_at 
         FROM activity_log 
         ORDER BY created_at DESC LIMIT $1`;
    const activityParams = agent ? [agent, limit] : [limit];
    const activityResult = await query(activityQuery, activityParams);

    // Get active sub-agents
    const subagentResult = await query(
      `SELECT id, parent_agent, subagent_id, task, model, status, started_at, completed_at, result 
       FROM subagent_registry 
       WHERE status = 'running' 
       ORDER BY started_at DESC`
    );

    // Get agent statuses
    const agentsResult = await query(
      `SELECT name, status, current_task, last_activity FROM agents ORDER BY name`
    );

    // Get recent sub-agent completions (last 24h)
    const recentCompleted = await query(
      `SELECT id, parent_agent, subagent_id, task, model, status, started_at, completed_at 
       FROM subagent_registry 
       WHERE status != 'running' AND completed_at > NOW() - INTERVAL '24 hours'
       ORDER BY completed_at DESC 
       LIMIT 20`
    );

    // Get dashboard metrics
    const eventsToday = await query(
      `SELECT COUNT(*) as count FROM activity_log WHERE created_at > CURRENT_DATE`
    );
    const deploysThisWeek = await query(
      `SELECT COUNT(*) as count FROM activity_log WHERE action IN ('deploy_success', 'deploy_smoke_test_failed') AND created_at > NOW() - INTERVAL '7 days'`
    );
    const uptimeResult = await query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time()))::integer as seconds FROM pg_stat_activity LIMIT 1`
    );

    const response = NextResponse.json({
      agents: agentsResult.rows,
      recentActivity: activityResult.rows,
      activeSubagents: subagentResult.rows,
      recentCompleted: recentCompleted.rows,
      metrics: {
        eventsToday: parseInt(eventsToday.rows[0]?.count || '0'),
        deploysThisWeek: parseInt(deploysThisWeek.rows[0]?.count || '0'),
        uptimeSeconds: parseInt(uptimeResult.rows[0]?.seconds || '0'),
      },
    });

    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('[API /activity/status] Error:', error);
    return NextResponse.json(
      { error: true, errorMessage: (error as Error).message },
      { status: 500 }
    );
  }
}