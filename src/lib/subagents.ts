/**
 * Subagent Monitoring Utilities
 * Helpers for tracking and monitoring subagent activity
 */

import { promises as fs } from 'fs';
import path from 'path';
import { calculateRuntime } from './agent-status';

const SUBAGENTS_PATH = path.resolve(process.cwd(), '../kanban/subagents.json');

export interface SubagentStatus {
  runId: string;
  label: string;
  task: string;
  status: string;
  runtime: string;
  totalTokens: number;
  startedAt: string;
  lastUpdated?: string;
  completedAt?: string;
}

export interface SubagentsData {
  active: SubagentStatus[];
  recent: SubagentStatus[];
}

/**
 * Get all subagents with calculated runtime
 */
export async function getAllSubagents(): Promise<SubagentsData> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);

    // Calculate runtime for all subagents
    const active = (data.active || []).map((subagent: any) => ({
      ...subagent,
      runtime: calculateRuntime(subagent.startedAt)
    }));

    const recent = (data.recent || []).map((subagent: any) => ({
      ...subagent,
      runtime: calculateRuntime(subagent.startedAt)
    }));

    return { active, recent };
  } catch (error) {
    console.error('Failed to get all subagents:', error);
    return { active: [], recent: [] };
  }
}

/**
 * Get active subagents count
 */
export async function getActiveSubagentsCount(): Promise<number> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);
    return (data.active || []).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Get specific subagent by runId
 */
export async function getSubagentByRunId(runId: string): Promise<SubagentStatus | null> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);

    // Search in active list first
    const active = (data.active || []).find((s: any) => s.runId === runId);
    if (active) {
      return {
        ...active,
        runtime: calculateRuntime(active.startedAt)
      };
    }

    // Then search in recent list
    const recent = (data.recent || []).find((s: any) => s.runId === runId);
    if (recent) {
      return {
        ...recent,
        runtime: calculateRuntime(recent.startedAt)
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to get subagent:', error);
    return null;
  }
}

/**
 * Get subagents by status
 */
export async function getSubagentsByStatus(status: string): Promise<SubagentStatus[]> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);

    const all = [...(data.active || []), ...(data.recent || [])];
    const filtered = all.filter((s: any) => s.status === status);

    return filtered.map((subagent: any) => ({
      ...subagent,
      runtime: calculateRuntime(subagent.startedAt)
    }));
  } catch (error) {
    console.error('Failed to get subagents by status:', error);
    return [];
  }
}

/**
 * Calculate total tokens used by all active subagents
 */
export async function getTotalActiveTokens(): Promise<number> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);
    
    return (data.active || []).reduce((sum: number, s: any) => sum + (s.totalTokens || 0), 0);
  } catch (error) {
    return 0;
  }
}

/**
 * Get average runtime of active subagents
 */
export async function getAverageRuntime(): Promise<string> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);
    
    const active = data.active || [];
    if (active.length === 0) return '0m';

    const totalMinutes = active.reduce((sum: number, s: any) => {
      const start = new Date(s.startedAt);
      const now = new Date();
      return sum + Math.floor((now.getTime() - start.getTime()) / 60000);
    }, 0);

    const avgMinutes = Math.floor(totalMinutes / active.length);
    
    if (avgMinutes < 60) return `${avgMinutes}m`;
    
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return `${hours}h ${mins}m`;
  } catch (error) {
    return '0m';
  }
}

/**
 * Cleanup old completed subagents (older than 24 hours)
 */
export async function cleanupOldSubagents(): Promise<{ cleaned: number }> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);
    
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Filter out old recent subagents
    const recent = (data.recent || []).filter((s: any) => {
      if (!s.completedAt) return true; // Keep if no completion time
      const completed = new Date(s.completedAt).getTime();
      return (now - completed) < oneDayMs;
    });
    
    const cleaned = data.recent.length - recent.length;
    data.recent = recent;
    
    await fs.writeFile(SUBAGENTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    return { cleaned };
  } catch (error) {
    console.error('Failed to cleanup old subagents:', error);
    return { cleaned: 0 };
  }
}

/**
 * Initialize subagents file if it doesn't exist
 */
export async function initializeSubagentsFile(): Promise<void> {
  try {
    await fs.access(SUBAGENTS_PATH);
  } catch (error) {
    // File doesn't exist, create it
    const initialData: SubagentsData = { active: [], recent: [] };
    await fs.writeFile(SUBAGENTS_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}
