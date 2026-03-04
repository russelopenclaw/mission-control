import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const KANBAN_PATH = path.resolve(process.cwd(), '../kanban/tasks.json');

// Read tasks from file
async function readTasks() {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist or is invalid, return default structure
    return { tasks: [], agents: {} };
  }
}

// Write tasks to file
async function writeTasks(data: any) {
  await fs.writeFile(KANBAN_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const column = searchParams.get('column');
  
  const data = await readTasks();
  let tasks = data.tasks || [];
  
  // Filter by column if specified (backward compatible)
  if (column) {
    tasks = tasks.filter((t: any) => t.column === column);
  }
  
  return NextResponse.json({ 
    tasks,
    agents: data.agents || {}
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await readTasks();
    
    const newTask: any = {
      id: `task-${Date.now()}`,
      title: body.title,
      column: body.column || 'backlog',
      assignee: body.assignee || 'alfred',
      priority: body.priority || 'medium',
      createdAt: new Date().toISOString(),
      description: body.description || undefined
    };
    
    // Add subtask tracking if parent task specified
    if (body.parentTaskId) {
      newTask.parentTaskId = body.parentTaskId;
      
      // Add to parent's subtasks array
      const parentIndex = (data.tasks || []).findIndex((t: any) => t.id === body.parentTaskId);
      if (parentIndex !== -1) {
        if (!data.tasks[parentIndex].subtasks) {
          data.tasks[parentIndex].subtasks = [];
        }
        data.tasks[parentIndex].subtasks.push(newTask.id);
      }
    }
    
    // Track agent assignment
    if (body.assignee) {
      newTask.assignedAt = new Date().toISOString();
    }
    
    // Initialize task history
    newTask.history = [
      {
        status: 'backlog',
        timestamp: new Date().toISOString(),
        note: 'Task created'
      }
    ];
    
    if (!data.tasks) data.tasks = [];
    data.tasks.push(newTask);
    
    await writeTasks(data);
    
    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await readTasks();
    
    if (!data.tasks) {
      return NextResponse.json(
        { error: 'No tasks found' },
        { status: 404 }
      );
    }
    
    const taskIndex = data.tasks.findIndex((t: any) => t.id === body.id);
    
    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    const task = data.tasks[taskIndex];
    let statusChanged = false;
    
    // Update the task
    if (body.column && body.column !== task.column) {
      task.column = body.column;
      statusChanged = true;
      
      // Add to history
      if (!task.history) task.history = [];
      task.history.push({
        status: body.column,
        timestamp: new Date().toISOString(),
        note: body.note || `Status changed to ${body.column}`
      });
    }
    
    if (body.title) task.title = body.title;
    if (body.priority) task.priority = body.priority;
    if (body.assignee && body.assignee !== task.assignee) {
      task.assignee = body.assignee;
      task.assignedAt = new Date().toISOString();
      if (!task.history) task.history = [];
      task.history.push({
        status: task.column,
        timestamp: new Date().toISOString(),
        note: `Assigned to ${body.assignee}`
      });
    }
    if (body.description !== undefined) task.description = body.description;
    if (body.subtasks) task.subtasks = body.subtasks;
    
    // Link subagent to task if provided
    if (body.subagentRunId) {
      task.subagentRunId = body.subagentRunId;
      if (!task.history) task.history = [];
      task.history.push({
        status: task.column,
        timestamp: new Date().toISOString(),
        note: `Linked to subagent ${body.subagentRunId}`
      });
    }
    
    await writeTasks(data);
    
    return NextResponse.json({ success: true, task: data.tasks[taskIndex] });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Task ID required' },
        { status: 400 }
      );
    }
    
    const data = await readTasks();
    
    if (!data.tasks) {
      return NextResponse.json({ success: true });
    }
    
    data.tasks = data.tasks.filter((t: any) => t.id !== id);
    await writeTasks(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
