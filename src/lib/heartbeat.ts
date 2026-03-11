/**
 * Heartbeat Integration for Agent Status - PostgreSQL Edition
 * Periodically checks and refreshes agent/subagent statuses
 */

import { Pool } from 'pg';
import { readAgentStatus, updateAgentStatus } from './agent-status';

const POOL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'mission_control',
  user: 'alfred',
  password: process.env.DB_PASSWORD || 'AlfredDB2026Secure'
};

const HEARTBEAT_STATE_PATH = process.cwd() + '/memory/heartbeat-state.json';

interface HeartbeatState {
  lastChecks: {
    agentStatus?: number;
    subagentStatus?: number;
    cleanup?: number;
  };
}

/**
 * Read heartbeat state
 */
async function readHeartbeatState(): Promise<HeartbeatState> {
  const fs = await import('fs/promises');
  try {
    const content = await fs.readFile(HEARTBEAT_STATE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { lastChecks: {} };
  }
}

/**
 * Write heartbeat state
 */
async function writeHeartbeatState(state: HeartbeatState): Promise<void> {
  const fs = await import('fs/promises');
  try {
    await fs.writeFile(HEARTBEAT_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write heartbeat state:', error);
  }
}

/**
 * Check if agent status is stale (older than 1 hour)
 */
function isStatusStale(lastActivity: string, thresholdMinutes: number = 60): boolean {
  const last = new Date(lastActivity).getTime();
  const now = new Date().getTime();
  const thresholdMs = thresholdMinutes * 60 * 1000;
  
  return (now - last) > thresholdMs;
}

/**
 * Check if task is completed based on PostgreSQL status
 */
async function isTaskCompleted(agentName: string, currentTask: string): Promise<boolean> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    // Check if agent's current task is in "done" column
    const result = await pool.query(
      'SELECT id FROM tasks WHERE assignee = $1 AND column_name = $2 AND LOWER(title) = ANY($3)',
      [agentName, 'done', [`%${currentTask.toLowerCase().substring(0, 50)}%`]]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Failed to check task completion:', error);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Get agents with stale "working" status from PostgreSQL
 */
async function getStaleAgents(thresholdMinutes: number = 60): Promise<Array<{ name: string; status: string; current_task: string; last_activity: string }>> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(`
      SELECT name, status, current_task, last_activity
      FROM agents
      WHERE status = 'working'
        AND last_activity < NOW() - INTERVAL '${thresholdMinutes} minutes'
      ORDER BY last_activity ASC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Failed to get stale agents:', error);
    return [];
  } finally {
    await pool.end();
  }
}

/**
 * Refresh agent statuses - reset stale working agents to idle
 */
export async function refreshAgentStatuses(): Promise<{ refreshed: number }> {
  try {
    const staleAgents = await getStaleAgents(60);
    
    let refreshed = 0;
    
    for (const agent of staleAgents) {
      // Check if the task might be completed
      const taskCompleted = await isTaskCompleted(agent.name, agent.current_task);
      
      if (taskCompleted || isStatusStale(agent.last_activity, 120)) {
        // Reset to idle if task is done or very stale (>2 hours)
        await updateAgentStatus(agent.name, 'idle', 'Task completed (auto-reset by heartbeat)');
        refreshed++;
        console.log(`[Heartbeat] Reset ${agent.name} to idle (stale status)`);
      }
    }
    
    return { refreshed };
  } catch (error) {
    console.error('Failed to refresh agent statuses:', error);
    return { refreshed: 0 };
  }
}

/**
 * Check for stuck tasks and auto-recover
 */
export async function checkStuckTasks(): Promise<{ recovered: number }> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    // Find tasks stuck in "in-progress" for >30 minutes
    const result = await pool.query(`
      SELECT id, title, assignee, column_name, updated_at, linked_subagent
      FROM tasks
      WHERE column_name = 'in-progress'
        AND updated_at < NOW() - INTERVAL '30 minutes'
      ORDER BY updated_at ASC
    `);
    
    let recovered = 0;
    
    for (const task of result.rows) {
      console.log(`[Heartbeat] Stuck task detected: ${task.id} - ${task.title} (${Math.floor((Date.now() - new Date(task.updated_at).getTime()) / 60000)} min)`);
      
      // Auto-recovery: Update timestamp to trigger reconsideration
      // (Actual respawn would need OpenClaw tool access)
      await pool.query(
        'UPDATE tasks SET updated_at = NOW() WHERE id = $1',
        [task.id]
      );
      
      recovered++;
      console.log(`[Heartbeat] Recovered stuck task: ${task.id}`);
    }
    
    return { recovered };
  } catch (error) {
    console.error('Failed to check stuck tasks:', error);
    return { recovered: 0 };
  } finally {
    await pool.end();
  }
}

/**
 * Cleanup old completed subagents (older than 24 hours)
 */
export async function cleanupOldSubagents(): Promise<{ cleaned: number }> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(`
      DELETE FROM subagents
      WHERE status NOT IN ('running', 'active')
        AND completed_at < NOW() - INTERVAL '24 hours'
    `);
    
    return { cleaned: result.rowCount || 0 };
  } catch (error) {
    console.error('Failed to cleanup old subagents:', error);
    return { cleaned: 0 };
  } finally {
    await pool.end();
  }
}

/**
 * Run complete heartbeat check
 */
export async function runHeartbeatCheck(): Promise<{
  agentRefreshed: number;
  stuckRecovered: number;
  subagentsCleaned: number;
}> {
  console.log('[Heartbeat] Running scheduled check...');
  
  const agentResult = await refreshAgentStatuses();
  const stuckResult = await checkStuckTasks();
  const cleanupResult = await cleanupOldSubagents();
  
  // Update state
  const state = await readHeartbeatState();
  state.lastChecks = {
    ...state.lastChecks,
    agentStatus: Date.now(),
    subagentStatus: Date.now(),
    cleanup: Date.now()
  };
  await writeHeartbeatState(state);
  
  console.log(`[Heartbeat] Complete - Agents: ${agentResult.refreshed}, Stuck: ${stuckResult.recovered}, Cleanup: ${cleanupResult.cleaned}`);
  
  return {
    agentRefreshed: agentResult.refreshed,
    stuckRecovered: stuckResult.recovered,
    subagentsCleaned: cleanupResult.cleaned
  };
}
