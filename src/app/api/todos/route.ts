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
    const notes = body.notes?.trim() || '';
    const result = await query(
      'INSERT INTO todos (text, priority, notes) VALUES ($1, $2, $3) RETURNING *',
      [text, priority, notes]
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
    const { id, done, text, notes } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Build dynamic UPDATE for whichever fields are provided
    const sets: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (done !== undefined) {
      sets.push(`done = $${paramIdx++}`);
      values.push(done);
      sets.push(`completed_at = $${paramIdx++}`);
      values.push(done ? new Date().toISOString() : null);
    }
    if (text !== undefined) {
      sets.push(`text = $${paramIdx++}`);
      values.push(text);
    }
    if (notes !== undefined) {
      sets.push(`notes = $${paramIdx++}`);
      values.push(notes);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const result = await query(
      `UPDATE todos SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
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