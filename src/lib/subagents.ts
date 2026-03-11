/**
 * Subagent Monitoring Utilities - PostgreSQL Edition
 * Helpers for tracking and monitoring subagent activity
 */

import { Pool } from 'pg';

const POOL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'mission_control',
  user: 'alfred',
  password: process.env.DB_PASSWORD || 'AlfredDB2026Secure'
};

export interface SubagentStatus {
  runId: string;
  label: string;
  task: string;
  status: string;
  runtime: string;
  totalTokens: number;
  startedAt: string;
  completedAt?: string;
}

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

/**
 * Get all subagents from PostgreSQL
 */
export async function getAllSubagents(): Promise<{ active: SubagentStatus[]; recent: SubagentStatus[] }> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(`
      SELECT run_id, label, task, status, total_tokens, started_at, completed_at
      FROM subagents
      ORDER BY started_at DESC
    `);
    
    const active: SubagentStatus[] = [];
    const recent: SubagentStatus[] = [];
    
    for (const row of result.rows) {
      const subagent: SubagentStatus = {
        runId: row.run_id,
        label: row.label,
        task: row.task,
        status: row.status,
        totalTokens: row.total_tokens || 0,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        runtime: calculateRuntime(row.started_at)
      };
      
      if (row.status === 'running' || row.status === 'active') {
        active.push(subagent);
      } else {
        recent.push(subagent);
      }
    }
    
    return { active, recent };
  } catch (error) {
    console.error('Failed to get all subagents:', error);
    return { active: [], recent: [] };
  } finally {
    await pool.end();
  }
}

/**
 * Get active subagents count
 */
export async function getActiveSubagentsCount(): Promise<number> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM subagents WHERE status IN ('running', 'active')"
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  } finally {
    await pool.end();
  }
}

/**
 * Get specific subagent by runId
 */
export async function getSubagentByRunId(runId: string): Promise<SubagentStatus | null> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(
      'SELECT run_id, label, task, status, total_tokens, started_at, completed_at FROM subagents WHERE run_id = $1',
      [runId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      runId: row.run_id,
      label: row.label,
      task: row.task,
      status: row.status,
      totalTokens: row.total_tokens || 0,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      runtime: calculateRuntime(row.started_at)
    };
  } catch (error) {
    console.error('Failed to get subagent:', error);
    return null;
  } finally {
    await pool.end();
  }
}

/**
 * Get subagents by status
 */
export async function getSubagentsByStatus(status: string): Promise<SubagentStatus[]> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(
      'SELECT run_id, label, task, status, total_tokens, started_at, completed_at FROM subagents WHERE status = $1',
      [status]
    );
    
    return result.rows.map(row => ({
      runId: row.run_id,
      label: row.label,
      task: row.task,
      status: row.status,
      totalTokens: row.total_tokens || 0,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      runtime: calculateRuntime(row.started_at)
    }));
  } catch (error) {
    console.error('Failed to get subagents by status:', error);
    return [];
  } finally {
    await pool.end();
  }
}

/**
 * Get total tokens used by all active subagents
 */
export async function getTotalActiveTokens(): Promise<number> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(
      "SELECT COALESCE(SUM(total_tokens), 0) as total FROM subagents WHERE status IN ('running', 'active')"
    );
    return parseInt(result.rows[0].total);
  } catch (error) {
    return 0;
  } finally {
    await pool.end();
  }
}

/**
 * Get average runtime of active subagents
 */
export async function getAverageRuntime(): Promise<string> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(
      "SELECT started_at FROM subagents WHERE status IN ('running', 'active')"
    );
    
    const active = result.rows;
    if (active.length === 0) return '0m';

    const totalMinutes = active.reduce((sum, row) => {
      const start = new Date(row.started_at);
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
  } finally {
    await pool.end();
  }
}
