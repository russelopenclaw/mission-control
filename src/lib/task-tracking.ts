/**
 * Task Tracking Utilities
 * Auto-link messages to tasks, track agent assignments
 */

import { promises as fs } from 'fs';
import path from 'path';

const KANBAN_PATH = path.resolve(process.cwd(), '../kanban/tasks.json');

interface Task {
  id: string;
  title: string;
  column: string;
  assignee?: string;
  assignedAt?: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
  description?: string;
  subtasks?: string[];
  parentTaskId?: string;
  subagentRunId?: string;
  history?: Array<{
    status: string;
    timestamp: string;
    note: string;
  }>;
}

interface KanbanData {
  tasks: Task[];
  agents: Record<string, any>;
}

/**
 * Find tasks by keyword matching in title or description
 */
export async function findTasksByKeyword(keyword: string): Promise<Task[]> {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data: KanbanData = JSON.parse(content);
    
    if (!data.tasks) return [];
    
    const keywordLower = keyword.toLowerCase();
    
    return data.tasks.filter((task: Task) => {
      const titleMatch = task.title.toLowerCase().includes(keywordLower);
      const descMatch = task.description?.toLowerCase().includes(keywordLower) || false;
      return titleMatch || descMatch;
    });
  } catch (error) {
    console.error('Failed to find tasks by keyword:', error);
    return [];
  }
}

/**
 * Get tasks assigned to a specific agent
 */
export async function getTasksByAssignee(assignee: string): Promise<Task[]> {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data: KanbanData = JSON.parse(content);
    
    if (!data.tasks) return [];
    
    return data.tasks.filter((task: Task) => task.assignee === assignee);
  } catch (error) {
    console.error('Failed to get tasks by assignee:', error);
    return [];
  }
}

/**
 * Auto-link a message to a task based on content
 */
export async function autoLinkMessageToTask(
  message: string, 
  agent: string
): Promise<{ linkedTask: Task | null; updated: boolean }> {
  try {
    // Try to find matching tasks by keyword
    const words = message.split(/\s+/).filter(w => w.length > 3);
    const foundTasks: Task[] = [];
    
    for (const word of words.slice(0, 5)) { // Check first 5 meaningful words
      const matches = await findTasksByKeyword(word);
      foundTasks.push(...matches);
    }
    
    if (foundTasks.length === 0) {
      return { linkedTask: null, updated: false };
    }
    
    // Find unique tasks
    const uniqueTasks = foundTasks.filter((task, index, self) =>
      index === self.findIndex(t => t.id === task.id)
    );
    
    // Filter to tasks in non-done states
    const activeTasks = uniqueTasks.filter(t => t.column !== 'done');
    
    if (activeTasks.length === 0) {
      return { linkedTask: null, updated: false };
    }
    
    // Prefer tasks assigned to this agent
    const assignedTask = activeTasks.find(t => t.assignee === agent);
    const taskToLink = assignedTask || activeTasks[0];
    
    // Update task to in-progress if it's in backlog
    if (taskToLink.column === 'backlog') {
      const content = await fs.readFile(KANBAN_PATH, 'utf-8');
      const data: KanbanData = JSON.parse(content);
      
      const taskIndex = data.tasks.findIndex(t => t.id === taskToLink.id);
      if (taskIndex !== -1) {
        data.tasks[taskIndex].column = 'in-progress';
        
        // Add to history
        if (!data.tasks[taskIndex].history) {
          data.tasks[taskIndex].history = [];
        }
        data.tasks[taskIndex].history.push({
          status: 'in-progress',
          timestamp: new Date().toISOString(),
          note: 'Auto-linked to message, marked as in-progress'
        });
        
        await fs.writeFile(KANBAN_PATH, JSON.stringify(data, null, 2), 'utf-8');
        
        return { 
          linkedTask: data.tasks[taskIndex], 
          updated: true 
        };
      }
    }
    
    return { linkedTask: taskToLink, updated: false };
  } catch (error) {
    console.error('Failed to auto-link message to task:', error);
    return { linkedTask: null, updated: false };
  }
}

/**
 * Get in-progress tasks for an agent
 */
export async function getInProgressTasks(agent: string): Promise<Task[]> {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data: KanbanData = JSON.parse(content);
    
    if (!data.tasks) return [];
    
    return data.tasks.filter((task: Task) => 
      task.assignee === agent && task.column === 'in-progress'
    );
  } catch (error) {
    console.error('Failed to get in-progress tasks:', error);
    return [];
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
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data: KanbanData = JSON.parse(content);
    
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, error: 'Task not found' };
    }
    
    const task = data.tasks[taskIndex];
    
    // Update status
    if (task.column !== 'in-progress') {
      task.column = 'in-progress';
      
      if (!task.history) task.history = [];
      task.history.push({
        status: 'in-progress',
        timestamp: new Date().toISOString(),
        note: `Agent ${agent} started working`
      });
    }
    
    // Update assignee
    task.assignee = agent;
    task.assignedAt = new Date().toISOString();
    
    // Link subagent if provided
    if (subagentRunId) {
      task.subagentRunId = subagentRunId;
      if (!task.history) task.history = [];
      task.history.push({
        status: 'in-progress',
        timestamp: new Date().toISOString(),
        note: `Linked to subagent ${subagentRunId}`
      });
    }
    
    await fs.writeFile(KANBAN_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    return { success: true, task: data.tasks[taskIndex] };
  } catch (error) {
    console.error('Failed to mark task in-progress:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Mark task as done
 */
export async function markTaskDone(
  taskId: string,
  note?: string
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data: KanbanData = JSON.parse(content);
    
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, error: 'Task not found' };
    }
    
    const task = data.tasks[taskIndex];
    
    // Update status
    task.column = 'done';
    task.completedAt = new Date().toISOString();
    
    if (!task.history) task.history = [];
    task.history.push({
      status: 'done',
      timestamp: new Date().toISOString(),
      note: note || 'Task completed'
    });
    
    await fs.writeFile(KANBAN_PATH, JSON.stringify(data, null, 2), 'utf-8');
    
    return { success: true, task: data.tasks[taskIndex] };
  } catch (error) {
    console.error('Failed to mark task done:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get task history
 */
export async function getTaskHistory(taskId: string): Promise<Array<{
  status: string;
  timestamp: string;
  note: string;
}> | null> {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data: KanbanData = JSON.parse(content);
    
    const task = data.tasks?.find(t => t.id === taskId);
    if (!task) return null;
    
    return task.history || [];
  } catch (error) {
    console.error('Failed to get task history:', error);
    return null;
  }
}
