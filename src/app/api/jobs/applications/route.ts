import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/jobs/applications - list all job applications
export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM job_applications ORDER BY 
       CASE status 
         WHEN 'interview' THEN 1 
         WHEN 'phone_screen' THEN 2 
         WHEN 'applied' THEN 3 
         WHEN 'interested' THEN 4 
         WHEN 'offer' THEN 0 
         WHEN 'rejected' THEN 5 
         WHEN 'withdrawn' THEN 6 
       END, 
       updated_at DESC`
    );

    const response = NextResponse.json({ applications: result.rows });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('[API /jobs/applications] Error:', error);
    return NextResponse.json(
      { error: true, errorMessage: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/jobs/applications - create a new job application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, company, location, url, source, salary_range, notes, status } = body;

    if (!title || !company) {
      return NextResponse.json(
        { error: true, errorMessage: 'title and company are required' },
        { status: 400 }
      );
    }

    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const result = await query(
      `INSERT INTO job_applications (id, title, company, location, url, source, salary_range, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, title, company, location || null, url || null, source || null, salary_range || null, notes || null, status || 'interested']
    );

    return NextResponse.json({ application: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[API /jobs/applications] Error:', error);
    return NextResponse.json(
      { error: true, errorMessage: (error as Error).message },
      { status: 500 }
    );
  }
}