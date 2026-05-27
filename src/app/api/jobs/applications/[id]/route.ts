import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PATCH /api/jobs/applications/[id] - update a job application
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ['status', 'applied_date', 'notes', 'salary_range', 'contact_name', 'contact_email', 'next_step', 'next_step_date', 'title', 'company', 'location', 'url', 'source'];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    // Auto-set applied_date when status changes to 'applied' or beyond
    if (body.status && ['applied', 'phone_screen', 'interview', 'offer'].includes(body.status)) {
      updates.push(`applied_date = COALESCE(applied_date, NOW())`);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: true, errorMessage: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE job_applications SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: true, errorMessage: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ application: result.rows[0] });
  } catch (error) {
    console.error('[API /jobs/applications/[id]] Error:', error);
    return NextResponse.json(
      { error: true, errorMessage: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/applications/[id] - delete a job application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query(
      `DELETE FROM job_applications WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: true, errorMessage: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /jobs/applications/[id]] Error:', error);
    return NextResponse.json(
      { error: true, errorMessage: (error as Error).message },
      { status: 500 }
    );
  }
}