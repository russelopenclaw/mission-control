import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM todos ORDER BY done ASC, created_at DESC'
    );
    return NextResponse.json({ todos: result.rows });
  } catch (error) {
    console.error('[API /todos GET] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    const priority = body.priority || 'normal';
    const result = await query(
      'INSERT INTO todos (text, priority) VALUES ($1, $2) RETURNING *',
      [text, priority]
    );
    return NextResponse.json({ todo: result.rows[0], success: true });
  } catch (error) {
    console.error('[API /todos POST] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, done } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    const completedAt = done ? new Date().toISOString() : null;
    const result = await query(
      'UPDATE todos SET done = $1, completed_at = $2 WHERE id = $3 RETURNING *',
      [done, completedAt, id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }
    return NextResponse.json({ todo: result.rows[0], success: true });
  } catch (error) {
    console.error('[API /todos PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    await query('DELETE FROM todos WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /todos DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Database error', details: (error as Error).message },
      { status: 500 }
    );
  }
}