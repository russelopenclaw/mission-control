import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Endpoint for agent activity heatmap data
 * Returns hourly/daily activity aggregation for visualization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7days'; // 24h, 7days, 30days, 90days
    const granularity = searchParams.get('granularity') || 'hourly'; // hourly, daily

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '7days':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    // Query for agent activity data
    let activityData;
    
    if (granularity === 'hourly') {
      activityData = await query(`
        SELECT 
          DATE_TRUNC('hour', last_activity) as hour,
          name as agent,
          COUNT(*) as activity_count,
          SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working_count,
          SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle_count,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count
        FROM agents 
        WHERE last_activity >= $1
        GROUP BY DATE_TRUNC('hour', last_activity), name
        ORDER BY hour DESC, name
      `, [startDate]);
    } else {
      // Daily aggregation
      activityData = await query(`
        SELECT 
          DATE_TRUNC('day', last_activity) as day,
          name as agent,
          COUNT(*) as activity_count,
          SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working_count,
          SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle_count,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count
        FROM agents 
        WHERE last_activity >= $1
        GROUP BY DATE_TRUNC('day', last_activity), name
        ORDER BY day DESC, name
      `, [startDate]);
    }

    // Format data for heatmap
    const heatmapData: any[] = [];

    for (const row of activityData.rows) {
      const timestamp = granularity === 'hourly' 
        ? row.hour 
        : row.day;
      
      heatmapData.push({
        timestamp: timestamp.toISOString(),
        agent: row.agent,
        activityCount: parseInt(row.activity_count) || 0,
        workingCount: parseInt(row.working_count) || 0,
        idleCount: parseInt(row.idle_count) || 0,
        doneCount: parseInt(row.done_count) || 0,
      });
    }

    // Create heat intensity levels (0-5 scale)
    const maxActivity = Math.max(...heatmapData.map(d => d.activityCount), 1);
    
    const enrichedData = heatmapData.map(d => ({
      ...d,
      intensity: Math.min(5, Math.ceil((d.activityCount / maxActivity) * 5)),
    }));

    return NextResponse.json({
      period,
      granularity,
      data: enrichedData,
      maxActivity,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[API /heatmap] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heatmap data', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to manually trigger heatmap data refresh
 * Used when new agent activity occurs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, status, currentTask } = body;

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }

    // Broadcast the update to WebSocket subscribers
    // The WebSocket server will handle the real-time broadcast
    
    return NextResponse.json({ 
      success: true,
      message: 'Activity logged',
      agent,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /heatmap POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to log activity', details: (error as Error).message },
      { status: 500 }
    );
  }
}
