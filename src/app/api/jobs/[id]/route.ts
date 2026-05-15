import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, next_step, next_step_date, salary_range, contact_name, contact_email } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIdx++}`);
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIdx++}`);
      values.push(notes);
    }
    if (next_step !== undefined) {
      updates.push(`next_step = $${paramIdx++}`);
      values.push(next_step);
    }
    if (next_step_date !== undefined) {
      updates.push(`next_step = $${paramIdx++}`);
      values.push(next_step_date);
    }
    if (salary_range !== undefined) {
      updates.push(`salary_range = $${paramIdx++}`);
      values.push(salary_range);
    }
    if (contact_name !== undefined) {
      updates.push(`contact_name = $${paramIdx++}`);
      values.push(contact_name);
    }
    if (contact_email !== undefined) {
      updates.push(`contact_email = $${paramIdx++}`);
      values.push(contact_email);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE job_applications SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('[Jobs API] Error updating job:', error);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query('DELETE FROM job_applications WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Jobs API] Error deleting job:', error);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}