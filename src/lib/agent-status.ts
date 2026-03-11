import { Pool } from 'pg';

const POOL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'mission_control',
  user: 'alfred',
  password: process.env.DB_PASSWORD || 'AlfredDB2026Secure'
};

interface AgentStatus {
  status: 'working' | 'idle';
  current_task: string;
  last_activity: string;
}

/**
 * Update agent status in PostgreSQL agents table
 * @param agent - Agent name (e.g., 'alfred', 'jeeves')
 * @param status - Agent status: 'working' or 'idle'
 * @param currentTask - Current task description
 */
export async function updateAgentStatus(
  agent: string,
  status: 'working' | 'idle',
  currentTask: string
): Promise<{ success: boolean; error?: string }> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    await pool.query(`
      INSERT INTO agents (name, status, current_task, last_activity)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (name) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        current_task = EXCLUDED.current_task,
        last_activity = NOW()
    `, [agent, status, currentTask]);

    return { success: true };
  } catch (error) {
    console.error('Failed to update agent status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  } finally {
    await pool.end();
  }
}

/**
 * Read current agent status from PostgreSQL
 * @param agent - Agent name (optional, if omitted returns all agents)
 */
export async function readAgentStatus(agent?: string): Promise<AgentStatus | Record<string, AgentStatus> | null> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    if (agent) {
      const result = await pool.query(
        'SELECT status, current_task, last_activity FROM agents WHERE name = $1',
        [agent]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } else {
      const result = await pool.query('SELECT name, status, current_task, last_activity FROM agents ORDER BY name');
      
      const agents: Record<string, AgentStatus> = {};
      for (const row of result.rows) {
        agents[row.name] = {
          status: row.status,
          current_task: row.current_task,
          last_activity: row.last_activity
        };
      }
      
      return agents;
    }
  } catch (error) {
    console.error('Failed to read agent status:', error);
    return null;
  } finally {
    await pool.end();
  }
}

/**
 * Get all agents with their current status
 */
export async function getAllAgents(): Promise<Array<{ name: string; status: string; currentTask: string; lastActivity: string }>> {
  const pool = new Pool(POOL_CONFIG);
  
  try {
    const result = await pool.query('SELECT name, status, current_task, last_activity FROM agents ORDER BY name');
    
    return result.rows.map(row => ({
      name: row.name,
      status: row.status,
      currentTask: row.current_task,
      lastActivity: row.last_activity
    }));
  } catch (error) {
    console.error('Failed to get all agents:', error);
    return [];
  } finally {
    await pool.end();
  }
}
