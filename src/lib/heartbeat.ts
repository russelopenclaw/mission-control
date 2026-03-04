/**
 * Heartbeat Integration for Agent Status
 * Periodically checks and refreshes agent/subagent statuses
 */

import { promises as fs } from 'fs';
import path from 'path';
import { readAgentStatus, updateAgentStatus } from './agent-status';
import { getAllSubagents, cleanupOldSubagents } from './subagents';

const KANBAN_PATH = path.resolve(process.cwd(), '../kanban/tasks.json');
const HEARTBEAT_STATE_PATH = path.resolve(process.cwd(), 'memory/heartbeat-state.json');

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
 * Check if task is completed based on kanban status
 */
async function isTaskCompleted(taskDescription: string): Promise<boolean> {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data = JSON.parse(content);
    
    // Check if any task with similar description is in "done" column
    const completedTasks = (data.tasks || []).filter((t: any) => 
      t.column === 'done' && t.description?.toLowerCase().includes(taskDescription.toLowerCase())
    );
    
    return completedTasks.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Refresh agent statuses - reset stale working agents to idle
 */
export async function refreshAgentStatuses(): Promise<{ refreshed: number }> {
  try {
    const agentStatuses = await readAgentStatus();
    if (!agentStatuses) return { refreshed: 0 };
    
    let refreshed = 0;
    
    for (const [agent, status] of Object.entries(agentStatuses)) {
      // Check if status is stale
      if (status.status === 'working' && isStatusStale(status.lastActivity)) {
        // Check if the task might be completed
        const taskCompleted = await isTaskCompleted(status.currentTask);
        
        if (taskCompleted || isStatusStale(status.lastActivity, 120)) {
          // Reset to idle if task is done or very stale (>2 hours)
          await updateAgentStatus(agent, 'idle', 'Task completed (auto-reset by heartbeat)');
          refreshed++;
          console.log(`[Heartbeat] Reset ${agent} to idle (stale status)`);
        }
      }
    }
    
    return { refreshed };
  } catch (error) {
    console.error('Failed to refresh agent statuses:', error);
    return { refreshed: 0 };
  }
}

/**
 * Update lastActivity timestamp for all agents
 */
export async function updateActivityTimestamps(): Promise<void> {
  try {
    const agentStatuses = await readAgentStatus();
    if (!agentStatuses) return;
    
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data = JSON.parse(content);
    
    // Update lastActivity for all non-working agents
    for (const [agent, status] of Object.entries(agentStatuses)) {
      if (status.status !== 'working') {
        data.agents[agent].lastActivity = new Date().toISOString();
      }
    }
    
    await fs.writeFile(KANBAN_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to update activity timestamps:', error);
  }
}

/**
 * Full heartbeat check - run all periodic maintenance
 */
export async function runHeartbeat(): Promise<{
  agentsRefreshed: number;
  subagentsCleaned: number;
  timestampsUpdated: number;
}> {
  try {
    console.log('[Heartbeat] Running periodic maintenance...');
    
    // Refresh agent statuses
    const { refreshed: agentsRefreshed } = await refreshAgentStatuses();
    
    // Cleanup old subagents
    const { cleaned: subagentsCleaned } = await cleanupOldSubagents();
    
    // Update timestamps
    await updateActivityTimestamps();
    
    // Update heartbeat state
    const state = await readHeartbeatState();
    const now = Date.now();
    
    state.lastChecks.agentStatus = now;
    state.lastChecks.subagentStatus = now;
    state.lastChecks.cleanup = now;
    
    await writeHeartbeatState(state);
    
    console.log(`[Heartbeat] Complete - Agents refreshed: ${agentsRefreshed}, Subagents cleaned: ${subagentsCleaned}`);
    
    return {
      agentsRefreshed,
      subagentsCleaned,
      timestampsUpdated: 1
    };
  } catch (error) {
    console.error('[Heartbeat] Error during maintenance:', error);
    return {
      agentsRefreshed: 0,
      subagentsCleaned: 0,
      timestampsUpdated: 0
    };
  }
}

/**
 * Check if heartbeat maintenance should run
 */
export async function shouldRunHeartbeat(intervalMinutes: number = 30): Promise<boolean> {
  try {
    const state = await readHeartbeatState();
    const now = Date.now();
    const lastCheck = state.lastChecks.agentStatus || 0;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    return (now - lastCheck) > intervalMs;
  } catch (error) {
    return true; // Run if we can't check state
  }
}

/**
 * Initialize heartbeat state file
 */
export async function initializeHeartbeat(): Promise<void> {
  try {
    await fs.access(HEARTBEAT_STATE_PATH);
  } catch (error) {
    // File doesn't exist, create it
    const initialState: HeartbeatState = { 
      lastChecks: {
        agentStatus: Date.now(),
        subagentStatus: Date.now(),
        cleanup: Date.now()
      }
    };
    await writeHeartbeatState(initialState);
  }
}
