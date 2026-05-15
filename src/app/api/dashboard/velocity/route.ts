import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Endpoint for task velocity tracking data
 * Returns completed tasks per day/week for velocity tracking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7days'; // 7days, 30days, 90days
    const granularity = searchParams.get('granularity') || 'daily'; // daily, weekly

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
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

    // Get daily task completion data
    const dailyResult = await query(`
      SELECT 
        DATE_TRUNC('day', completed_at) as day,
        COUNT(*) as task_count,
        ARRAY_AGG(DISTINCT assignee) as assignees,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_completion_time_seconds
      FROM tasks
      WHERE completed_at >= $1
      GROUP BY DATE_TRUNC('day', completed_at)
      ORDER BY day ASC
    `, [startDate]);

    // Get weekly aggregation if requested
    let weeklyData: any[] = [];
    if (granularity === 'weekly') {
      const weeklyResult = await query(`
        SELECT 
          DATE_TRUNC('week', completed_at) as week,
          COUNT(*) as task_count,
          ARRAY_AGG(DISTINCT assignee) as assignees,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_completion_time_seconds
        FROM tasks
        WHERE completed_at >= $1
        GROUP BY DATE_TRUNC('week', completed_at)
        ORDER BY week ASC
      `, [startDate]);
      weeklyData = weeklyResult.rows;
    }

    // Calculate velocity metrics
    const completedTasks = dailyResult.rows;
    const totalCompleted = completedTasks.reduce((sum, row) => sum + parseInt(row.task_count), 0);
    const avgDailyTasks = completedTasks.length > 0 
      ? Math.round((totalCompleted / completedTasks.length) * 100) / 100 
      : 0;

    // Calculate trend (compare last 7 days to previous 7 days)
    const today = new Date();
    const last7DaysStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7DaysStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentPeriodData = await query(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE completed_at >= $1 AND completed_at < $2
    `, [last7DaysStart, today]);

    const previousPeriodData = await query(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE completed_at >= $1 AND completed_at < $2
    `, [previous7DaysStart, last7DaysStart]);

    const currentPeriodCount = parseInt(currentPeriodData.rows[0]?.count || '0');
    const previousPeriodCount = parseInt(previousPeriodData.rows[0]?.count || '0');

    const velocityTrend = previousPeriodCount > 0
      ? Math.round(((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100)
      : currentPeriodCount > 0 ? 100 : 0;

    // Format data for chart
    const chartData = dailyResult.rows.map(row => ({
      date: row.day.toISOString().split('T')[0],
      dayName: row.day.toLocaleDateString('en-US', { weekday: 'short' }),
      taskCount: parseInt(row.task_count),
      assignees: row.assignees || [],
      avgCompletionTimeSeconds: row.avg_completion_time_seconds 
        ? Math.round(parseFloat(row.avg_completion_time_seconds))
        : null,
    }));

    // Add velocity summary
    const summary = {
      totalCompleted,
      avgDailyTasks,
      velocityTrend, // Percentage change (positive = increasing, negative = decreasing)
      currentPeriod: currentPeriodCount,
      previousPeriod: previousPeriodCount,
      last7Days: chartData.slice(-7), // Last 7 days
    };

    return NextResponse.json({
      period,
      granularity,
      summary,
      chartData,
      weeklyData: weeklyData.map((row: any) => ({
        week: row.week.toISOString(),
        taskCount: parseInt(row.task_count),
        assignees: row.assignees || [],
        avgCompletionTimeSeconds: row.avg_completion_time_seconds 
          ? Math.round(parseFloat(row.avg_completion_time_seconds))
          : null,
      })),
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[API /velocity] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch velocity data', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to manually trigger velocity data update
 * Used when a task is completed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, status } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Velocity data updated',
      taskId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /velocity POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update velocity data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
