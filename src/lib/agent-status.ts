import { promises as fs } from 'fs';
import path from 'path';

const KANBAN_PATH = path.resolve(process.cwd(), '../kanban/tasks.json');
const SUBAGENTS_PATH = path.resolve(process.cwd(), '../kanban/subagents.json');

interface AgentStatus {
  status: 'working' | 'idle';
  currentTask: string;
  lastActivity: string;
}

interface SubagentStatus {
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

interface KanbanData {
  tasks: any[];
  agents: Record<string, AgentStatus>;
}

interface SubagentsData {
  active: SubagentStatus[];
  recent: SubagentStatus[];
}

/**
 * Update agent status in kanban/tasks.json
 * @param agent - Agent name (e.g., 'alfred', 'jeeves')
 * @param status - Agent status: 'working' or 'idle'
 * @param currentTask - Current task description
 */
export async function updateAgentStatus(
  agent: string,
  status: 'working' | 'idle',
  currentTask: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Read current data
    let data: KanbanData;
    try {
      const content = await fs.readFile(KANBAN_PATH, 'utf-8');
      data = JSON.parse(content);
    } catch (error) {
      // File doesn't exist, create default structure
      data = { tasks: [], agents: {} };
    }

    // Initialize agents object if it doesn't exist
    if (!data.agents) {
      data.agents = {};
    }

    // Update agent status
    data.agents[agent] = {
      status,
      currentTask,
      lastActivity: new Date().toISOString()
    };

    // Write back to file
    await fs.writeFile(KANBAN_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return { success: true };
  } catch (error) {
    console.error('Failed to update agent status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Read current agent status from kanban/tasks.json
 * @param agent - Agent name (optional, if omitted returns all agents)
 */
export async function readAgentStatus(agent?: string): Promise<AgentStatus | Record<string, AgentStatus> | null> {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data: KanbanData = JSON.parse(content);

    if (!data.agents) {
      return null;
    }

    if (agent) {
      return data.agents[agent] || null;
    }

    return data.agents;
  } catch (error) {
    console.error('Failed to read agent status:', error);
    return null;
  }
}

/**
 * Update subagent status in kanban/subagents.json
 * @param runId - Unique subagent run ID
 * @param status - Status: 'running', 'done', 'idle', 'error'
 * @param task - Current task description
 * @param label - Subagent label/name
 */
export async function updateSubagentStatus(
  runId: string,
  status: string,
  task: string,
  label: string = 'Unnamed Subagent'
): Promise<{ success: boolean; error?: string }> {
  try {
    let data: SubagentsData;
    try {
      const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
      data = JSON.parse(content);
    } catch (error) {
      // File doesn't exist, create default structure
      data = { active: [], recent: [] };
    }

    // Initialize arrays if they don't exist
    if (!data.active) data.active = [];
    if (!data.recent) data.recent = [];

    // Check if subagent already exists in active list
    const existingIndex = data.active.findIndex(s => s.runId === runId);
    
    if (existingIndex !== -1) {
      // Update existing subagent
      data.active[existingIndex] = {
        ...data.active[existingIndex],
        status,
        task,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Create new subagent entry
      const newSubagent: SubagentStatus = {
        runId,
        label,
        task,
        status,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalTokens: 0,
        runtime: '0m'
      };
      
      data.active.push(newSubagent);
    }

    // If status is done/completed, move to recent list
    if (status === 'done' || status === 'completed' || status === 'idle') {
      const activeIndex = data.active.findIndex(s => s.runId === runId);
      if (activeIndex !== -1) {
        const completed = data.active.splice(activeIndex, 1)[0];
        completed.status = 'done';
        completed.completedAt = new Date().toISOString();
        
        // Add to recent (keep only last 10)
        data.recent.unshift(completed);
        if (data.recent.length > 10) {
          data.recent = data.recent.slice(0, 10);
        }
      }
    }

    // Write back to file
    await fs.writeFile(SUBAGENTS_PATH, JSON.stringify(data, null, 2), 'utf-8');

    return { success: true };
  } catch (error) {
    console.error('Failed to update subagent status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get specific subagent status
 * @param runId - Subagent run ID
 */
export async function getSubagentStatus(runId: string): Promise<SubagentStatus | null> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data: SubagentsData = JSON.parse(content);

    // Search in active list first
    const active = data.active?.find(s => s.runId === runId);
    if (active) return active;

    // Then search in recent list
    const recent = data.recent?.find(s => s.runId === runId);
    if (recent) return recent;

    return null;
  } catch (error) {
    console.error('Failed to get subagent status:', error);
    return null;
  }
}

/**
 * Get all subagents (active and recent)
 */
export async function getAllSubagents(): Promise<{ active: SubagentStatus[]; recent: SubagentStatus[] }> {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data: SubagentsData = JSON.parse(content);

    return {
      active: data.active || [],
      recent: data.recent || []
    };
  } catch (error) {
    console.error('Failed to get all subagents:', error);
    return { active: [], recent: [] };
  }
}

/**
 * Calculate runtime duration from startedAt to now
 */
export function calculateRuntime(startedAt: string): string {
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
