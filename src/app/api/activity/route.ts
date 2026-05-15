import { NextResponse } from 'next/server';

const DB_URL = process.env.DATABASE_URL || 'postgresql://alfred:AlfredDB2026Secure@localhost:5432/mission_control';
const PLEX_URL = 'http://server:32400';
const PLEX_TOKEN = 'z7Bh1q4cqgmNEzfF6EFW';

interface ActivityEvent {
  id: string;
  type: 'task' | 'agent' | 'plex' | 'reminder' | 'calendar';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  metadata?: Record<string, unknown>;
}

async function queryPg(sql: string): Promise<any[]> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const result = await client.query(sql);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function fetchPlex(path: string): Promise<any> {
  try {
    const res = await fetch(`${PLEX_URL}${path}?X-Plex-Token=${PLEX_TOKEN}`, {
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    // Parse XML to JSON-ish structure
    return text;
  } catch {
    return null;
  }
}

function parseXmlHistory(xml: string): Array<{title: string, show: string, user: string, viewedAt: number}> {
  const results: Array<{title: string, show: string, user: string, viewedAt: number}> = [];
  const videoRegex = /<Video[^>]*grandparentTitle="([^"]*)"[^>]*title="([^"]*)"[^>]*viewedAt="(\d+)"[^>]*accountID="(\d+)"[^>]*\/>/g;
  // Account ID mapping happens client-side
  let match;
  while ((match = videoRegex.exec(xml)) !== null) {
    results.push({
      show: match[1],
      title: match[2],
      viewedAt: parseInt(match[3]),
      user: match[4], // accountID, mapped client-side
    });
  }
  return results.slice(0, 10);
}

export async function GET() {
  const events: ActivityEvent[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  try {
    // Task activity
    const tasks = await queryPg(`
      SELECT id, title, column_name, assignee, updated_at, completed_at, started_at 
      FROM tasks 
      WHERE column_name NOT IN ('archived', 'DONE', 'done')
         OR (updated_at > '${today}' AND column_name = 'done')
      ORDER BY updated_at DESC 
      LIMIT 10
    `);

    for (const task of tasks) {
      let type: ActivityEvent['type'] = 'task';
      let icon = '📋';
      let desc = '';

      if (task.column_name === 'in-progress') {
        icon = '🔄';
        desc = `In progress — ${task.assignee || 'unassigned'}`;
      } else if (task.column_name === 'done') {
        icon = '✅';
        desc = 'Completed';
        type = 'task';
      } else if (task.column_name === 'backlog') {
        icon = '📥';
        desc = 'In backlog';
      } else {
        desc = task.column_name;
      }

      events.push({
        id: `task-${task.id}`,
        type,
        title: task.title,
        description: desc,
        timestamp: task.updated_at?.toISOString() || task.created_at?.toISOString() || today,
        icon,
        metadata: { taskId: task.id, assignee: task.assignee, status: task.column_name },
      });
    }
  } catch (e) {
    // DB unavailable
  }

  try {
    // Agent activity
    const agents = await queryPg(`
      SELECT name, status, current_task, last_activity 
      FROM agents 
      ORDER BY last_activity DESC
    `);

    for (const agent of agents) {
      if (agent.last_activity) {
        const lastAct = new Date(agent.last_activity);
        const ageHours = (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60);
        
        if (ageHours < 24) {
          events.push({
            id: `agent-${agent.name}`,
            type: 'agent',
            title: `${agent.name}: ${agent.status}`,
            description: agent.current_task || 'Idle',
            timestamp: agent.last_activity.toISOString(),
            icon: agent.status === 'working' ? '🟢' : '⚪',
            metadata: { agent: agent.name, status: agent.status },
          });
        }
      }
    }
  } catch (e) {
    // DB unavailable
  }

  try {
    // Reminder activity
    const reminders = await queryPg(`
      SELECT id, title, due_date, due_time, completed 
      FROM reminders 
      WHERE due_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY due_date DESC, due_time DESC
      LIMIT 5
    `);

    for (const reminder of reminders) {
      events.push({
        id: `reminder-${reminder.id}`,
        type: 'reminder',
        title: reminder.title,
        description: reminder.completed ? 'Completed' : `Due: ${reminder.due_date}`,
        timestamp: new Date(reminder.due_date).toISOString(),
        icon: reminder.completed ? '🔔✅' : '🔔',
      });
    }
  } catch (e) {
    // DB unavailable
  }

  try {
    // Plex activity
    const plexXml = await fetchPlex('/status/sessions/history/all');
    if (plexXml) {
      const recentWatches = parseXmlHistory(plexXml).slice(0, 5);
      for (const watch of recentWatches) {
        events.push({
          id: `plex-${watch.viewedAt}`,
          type: 'plex',
          title: watch.show ? `${watch.show}: ${watch.title}` : watch.title,
          description: `Watched by user #${watch.user}`,
          timestamp: new Date(watch.viewedAt * 1000).toISOString(),
          icon: '🎬',
          metadata: { show: watch.show, episode: watch.title, accountId: watch.user },
        });
      }
    }
  } catch (e) {
    // Plex unavailable
  }

  // Sort all events by timestamp, newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ events, generatedAt: now.toISOString() });
}

export const dynamic = 'force-dynamic';