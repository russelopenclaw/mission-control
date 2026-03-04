import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MEMORY_DIR = path.resolve(process.cwd(), '../memory');
const MEMORY_FILE = path.resolve(process.cwd(), '../MEMORY.md');

// Search across all memories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const dateStart = searchParams.get('from') || null;
    const dateEnd = searchParams.get('to') || null;
    
    if (!query && !dateStart && !dateEnd) {
      return NextResponse.json({ error: 'Search query or date range required' }, { status: 400 });
    }
    
    const results: Array<{
      source: string;
      date: string;
      content: string;
      matchPreview: string;
      score: number;
    }> = [];
    
    const lowerQuery = query.toLowerCase();
    
    // Search daily memories
    const entries = await fs.readdir(MEMORY_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const dateStr = entry.name.replace('.md', '');
        
        // Check date filter
        if (dateStart && dateStr < dateStart) continue;
        if (dateEnd && dateStr > dateEnd) continue;
        
        const filePath = path.join(MEMORY_DIR, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        
        if (query && content.toLowerCase().includes(lowerQuery)) {
          // Find matching lines
          const lines = content.split('\n');
          const matchingLines = lines.filter(line => 
            line.toLowerCase().includes(lowerQuery)
          );
          
          results.push({
            source: 'daily',
            date: dateStr,
            content: content,
            matchPreview: matchingLines.slice(0, 3).join('\n'),
            score: matchingLines.length / lines.length
          });
        }
      }
    }
    
    // Search long-term memory
    try {
      const longTermContent = await fs.readFile(MEMORY_FILE, 'utf-8');
      if (query && longTermContent.toLowerCase().includes(lowerQuery)) {
        const lines = longTermContent.split('\n');
        const matchingLines = lines.filter(line => 
          line.toLowerCase().includes(lowerQuery)
        );
        
        results.push({
          source: 'longterm',
          date: 'MEMORY.md',
          content: longTermContent,
          matchPreview: matchingLines.slice(0, 3).join('\n'),
          score: matchingLines.length / lines.length
        });
      }
    } catch {
      // MEMORY.md doesn't exist, skip
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return NextResponse.json({ results, query, dateStart, dateEnd });
  } catch (error) {
    console.error('Failed to search memories:', error);
    return NextResponse.json(
      { error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}
