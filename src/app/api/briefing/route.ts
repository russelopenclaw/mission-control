import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Cache duration: 5 minutes (300 seconds)
export const revalidate = 300;

async function fetchWeather() {
  try {
    const response = await fetch('https://wttr.in/?format=j1', {
      headers: { 'Accept': 'application/json' },
      cache: 'force-cache',
    });
    
    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
    
    const data = await response.json();
    const current = data.current_condition?.[0];
    
    return {
      tempC: current?.temp_C || 'N/A',
      tempF: current?.temp_F || 'N/A',
      condition: current?.weatherDesc?.[0]?.value || 'Unknown',
      icon: current?.weatherIconUrl?.[0]?.value || '',
      humidity: current?.humidity || 'N/A',
      wind: current?.windspeedKmph ? `${current.windspeedKmph} km/h` : 'N/A',
    };
  } catch (error) {
    console.error('[Weather API] Failed:', error);
    return null;
  }
}

async function fetchCalendar() {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/5day', {
      cache: 'force-cache',
    });
    
    if (!response.ok) throw new Error(`Calendar API error: ${response.status}`);
    
    const data = await response.json();
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's events from the first day in the 5-day response
    const todayEvents = (data.days || []).find((d: any) => d.date === today);
    
    return todayEvents?.events || [];
  } catch (error) {
    console.error('[Calendar API] Failed:', error);
    return null;
  }
}

async function fetchOverdueReminders() {
  try {
    const result = await query(
      `SELECT id, title, description, due_date, created_at 
       FROM reminders 
       WHERE due_date < CURRENT_DATE 
       AND completed = false 
       ORDER BY due_date ASC`
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('[Overdue Reminders] Failed:', error);
    return null;
  }
}

async function fetchPlexActivity() {
  try {
    const response = await fetch('http://localhost:3000/api/plex/activity', {
      cache: 'force-cache',
    });
    
    if (!response.ok) throw new Error(`Plex API error: ${response.status}`);
    
    const data = await response.json();
    
    // Get last 5 watches (most recent in history)
    const recentWatches = (data.recentWatches || []).slice(0, 5).map((item: any) => ({
      title: item.title,
      show: item.show,
      type: item.type,
      viewedAt: item.viewedAt,
      username: item.username,
    }));
    
    return {
      count: data.recentWatches?.length || 0,
      watches: recentWatches,
    };
  } catch (error) {
    console.error('[Plex Activity] Failed:', error);
    return null;
  }
}

async function fetchAgentStatus() {
  try {
    const result = await query(
      `SELECT name, status, current_task, last_activity 
       FROM agents 
       ORDER BY name`
    );
    
    return result.rows.map((row: any) => ({
      name: row.name,
      status: row.status,
      currentTask: row.current_task,
      lastActivity: row.last_activity,
    }));
  } catch (error) {
    console.error('[Agent Status] Failed:', error);
    return null;
  }
}

async function fetchTasksInProgress() {
  try {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM tasks 
       WHERE started_at IS NOT NULL 
       AND completed_at IS NULL`
    );
    
    return result.rows[0]?.count || 0;
  } catch (error) {
    console.error('[Tasks Count] Failed:', error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Fetch all data in parallel
    const [weather, calendar, overdue, plex, agents, tasksCount] = await Promise.all([
      fetchWeather(),
      fetchCalendar(),
      fetchOverdueReminders(),
      fetchPlexActivity(),
      fetchAgentStatus(),
      fetchTasksInProgress(),
    ]);

    const response = NextResponse.json({
      weather,
      calendar: calendar || [],
      overdue: overdue || [],
      recentPlex: plex,
      agentStatus: agents || [],
      tasksInProgress: tasksCount,
      fetchedAt: new Date().toISOString(),
    });
    
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=300');
    return response;
    
  } catch (error) {
    console.error('[Briefing API] Error:', error);
    
    const response = NextResponse.json({
      weather: null,
      calendar: [],
      overdue: [],
      recentPlex: null,
      agentStatus: [],
      tasksInProgress: 0,
      error: true,
      errorMessage: (error as Error).message,
      fetchedAt: new Date().toISOString(),
    });
    
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
