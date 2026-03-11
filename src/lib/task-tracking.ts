/**
 * Task Tracking Utilities - PostgreSQL Edition
 * Auto-link messages to tasks, track agent assignments
 */

import { Pool } from 'pg';

const POOL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'mission_control',
  user: 'alfred',
  password: process.env.DB_PASSWORD || 'AlfredDB2026Secure' // fallback for dev
};

interface Task {
  id: string;
  title: string;
  column_name: string;
  assignee?: string;
  started_at?: string;
  priority: string;
  created_at: string;
  completed_at?: string;
  description?: string;
  linked_subagent?: string;
}

/**
 * Find tasks by keyword matching in title or description
 */
export async function findTasksByKeyword(keyword: string): Promise<Task[]> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const keywordLower = keyword.toLowerCase();
    const result = await pool.query(`
      SELECT id, title, column_name, assignee, priority, created_at, description, linked_subagent
      FROM tasks
      WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1
      ORDER BY created_at DESC
    `, [`%${keywordLower}%`]);
    
    return result.rows;
  } catch (error) {
    console.error('Failed to find tasks by keyword:', error);
    return [];
  } finally {
    await pool.end();
  }
}

/**
 * Get tasks assigned to a specific agent
 */
export async function getTasksByAssignee(assignee: string): Promise<Task[]> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(
      'SELECT id, title, column_name, priority, created_at, description FROM tasks WHERE assignee = $1 ORDER BY created_at DESC',
      [assignee]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Failed to get tasks by assignee:', error);
    return [];
  } finally {
    await pool.end();
  }
}

/**
 * Get in-progress tasks for an agent
 */
export async function getInProgressTasks(agent: string): Promise<Task[]> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(
      'SELECT id, title, column_name, priority, created_at, linked_subagent FROM tasks WHERE assignee = $1 AND column_name = $2',
      [agent, 'in-progress']
    );
    
    return result.rows;
  } catch (error) {
    console.error('Failed to get in-progress tasks:', error);
    return [];
  } finally {
    await pool.end();
  }
}

/**
 * Update task when agent starts working
 */
export async function markTaskInProgress(
  taskId: string,
  agent: string,
  subagentRunId?: string
): Promise<{ success: boolean; task?: Task; error?: string }> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    // Update task to in-progress
    const result = await pool.query(`
      UPDATE tasks 
      SET column_name = 'in-progress',
          assignee = $1,
          started_at = COALESCE(started_at, NOW()),
          updated_at = NOW(),
          linked_subagent = COALESCE($2, linked_subagent)
      WHERE id = $3
      RETURNING *
    `, [agent, subagentRunId, taskId]);
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Task not found' };
    }
    
    return { success: true, task: result.rows[0] };
  } catch (error) {
    console.error('Failed to mark task in-progress:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  } finally {
    await pool.end();
  }
}

/**
 * Mark task as done
 */
export async function markTaskDone(
  taskId: string,
  note?: string
): Promise<{ success: boolean; task?: Task; error?: string }> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query(`
      UPDATE tasks 
      SET column_name = 'done',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [taskId]);
    
    if (result.rows.length === 0) {
      return { success: false, error: 'Task not found' };
    }
    
    return { success: true, task: result.rows[0] };
  } catch (error) {
    console.error('Failed to mark task done:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  } finally {
    await pool.end();
  }
}
