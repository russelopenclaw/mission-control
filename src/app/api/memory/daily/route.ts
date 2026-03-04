import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MEMORY_DIR = path.resolve(process.cwd(), '../memory');

interface DailyMemoryMeta {
  date: string;
  title: string | null;
  memoryCount: number;
  preview: string;
  filePath: string;
}

// Get all daily memory files with metadata
export async function GET() {
  try {
    const entries = await fs.readdir(MEMORY_DIR, { withFileTypes: true });
    const memories: DailyMemoryMeta[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const dateStr = entry.name.replace('.md', '');
        const filePath = path.join(MEMORY_DIR, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extract title from first heading or first line
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].replace(/^[0-9-]+\s*-\s*/, '') : null;
        
        // Count memory entries (lines starting with - or numbers)
        const memoryCount = (content.match(/^[-*]\s/gm) || []).length + 
                           (content.match(/^\d+\.\s/gm) || []).length;
        
        // Get preview (first 150 chars after title)
        const contentWithoutTitle = content.replace(/^#\s+.+\n+/, '');
        const preview = contentWithoutTitle.slice(0, 150).trim() + 
                       (contentWithoutTitle.length > 150 ? '...' : '');

        memories.push({
          date: dateStr,
          title,
          memoryCount: memoryCount || 1,
          preview,
          filePath
        });
      }
    }

    // Sort by date descending (newest first)
    memories.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Failed to fetch daily memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily memories' },
      { status: 500 }
    );
  }
}
