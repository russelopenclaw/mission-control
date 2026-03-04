import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MEMORY_FILE = path.resolve(process.cwd(), '../MEMORY.md');

// Get long-term memory content
export async function GET() {
  try {
    const content = await fs.readFile(MEMORY_FILE, 'utf-8');
    
    // Parse sections
    const sections: { title: string; content: string }[] = [];
    const sectionRegex = /^##\s+(.+)$/gm;
    let match;
    const sectionStarts: { title: string; index: number }[] = [];
    
    while ((match = sectionRegex.exec(content)) !== null) {
      sectionStarts.push({
        title: match[1],
        index: match.index
      });
    }
    
    for (let i = 0; i < sectionStarts.length; i++) {
      const start = sectionStarts[i];
      const end = sectionStarts[i + 1] || { index: content.length };
      const sectionContent = content.slice(start.index, end.index).trim();
      
      sections.push({
        title: start.title,
        content: sectionContent
      });
    }
    
    return NextResponse.json({ 
      content,
      sections,
      exists: true 
    });
  } catch (error) {
    console.error('Failed to fetch long-term memory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch long-term memory', exists: false },
      { status: 500 }
    );
  }
}
