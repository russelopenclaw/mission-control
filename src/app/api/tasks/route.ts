import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const column = searchParams.get('column');
    const limit = searchParams.get('limit');
    
    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    
    if (column) {
      params.push(column);
      sql += ' WHERE column_name = $1';
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (limit) {
      params.push(parseInt(limit));
      sql += ' LIMIT $' + params.length;
    }
    
    const result = await query(sql, params);
    
    // Get agents
    const agentsResult = await query('SELECT * FROM agents');
    
    // Transform rows to match old JSON structure
    const tasks = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      column: row.column_name,  // Map back to 'column' for frontend compatibility
      assignee: row.assignee,
      priority: row.priority,
      description: row.description,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      linkedSubagent: row.linked_subagent,
    }));
    
    const agents: any = {};
    for (const agent of agentsResult.rows) {
      agents[agent.name] = {
        status: agent.status,
        currentTask: agent.current_task,
        lastActivity: agent.last_activity,
      };
    }
    
    return NextResponse.json({ tasks, agents });
    
  } catch (error) {
    console.error('[API /tasks] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await query(
      `INSERT INTO tasks (
        id, title, column_name, assignee, priority, description,
        linked_subagent, created_at, started_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        body.id || `task-${Date.now()}`,
        body.title,
        body.column || 'backlog',
        body.assignee || 'alfred',
        body.priority || 'medium',
        body.description || null,
        body.linkedSubagent || null,
        new Date().toISOString(),
        body.startedAt || null,
      ]
    );
    
    return NextResponse.json({ task: result.rows[0], success: true });
    
  } catch (error) {
    console.error('[API /tasks POST] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }
    
    // Build dynamic update query
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Map frontend field names to database column names
    const fieldMap: Record<string, string> = {
      column: 'column_name',
      currentTask: 'current_task',  // for agents
      lastActivity: 'last_activity',
      startedAt: 'started_at',
      completedAt: 'completed_at',
      linkedSubagent: 'linked_subagent',
    };
    
    for (const [field, value] of Object.entries(updates)) {
      const dbField = fieldMap[field] || field;
      setClauses.push(`${dbField} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    
    const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(sql, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    return NextResponse.json({ task: result.rows[0], success: true });
    
  } catch (error) {
    console.error('[API /tasks PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
