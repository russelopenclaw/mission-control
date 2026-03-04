import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface DailyMemoryParams {
  params: Promise<{
    date: string;
  }>;
}

// Get specific day's memory content
export async function GET(request: NextRequest, { params }: DailyMemoryParams) {
  try {
    const { date } = await params;
    const filePath = path.join(path.resolve(process.cwd(), '../memory'), `${date}.md`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({ 
        date,
        content,
        exists: true 
      });
    } catch {
      return NextResponse.json({ 
        date,
        content: null,
        exists: false 
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to fetch memory for date:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memory' },
      { status: 500 }
    );
  }
}
