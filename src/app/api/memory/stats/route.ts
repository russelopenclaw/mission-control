import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MEMORY_DIR = path.resolve(process.cwd(), '../memory');
const MEMORY_FILE = path.resolve(process.cwd(), '../MEMORY.md');
const MEM0_FILE = path.resolve(process.cwd(), '../.mem0/kevin-memories.json');

// Get memory statistics
export async function GET() {
  try {
    const stats: {
      dailyMemories: number;
      longTermMemoryExists: boolean;
      memoriesThisWeek: number;
      memoriesThisMonth: number;
      mem0Stats: {
        exists: boolean;
        memoryCount?: number;
        size?: number;
      };
    } = {
      dailyMemories: 0,
      longTermMemoryExists: false,
      memoriesThisWeek: 0,
      memoriesThisMonth: 0,
      mem0Stats: {
        exists: false
      }
    };
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Count daily memories
    const entries = await fs.readdir(MEMORY_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const dateStr = entry.name.replace('.md', '');
        stats.dailyMemories++;
        
        // Check if within this week/month
        try {
          const fileDate = new Date(dateStr);
          if (fileDate >= oneWeekAgo) {
            stats.memoriesThisWeek++;
          }
          if (fileDate >= oneMonthAgo) {
            stats.memoriesThisMonth++;
          }
        } catch {
          // Invalid date format, skip
        }
      }
    }
    
    // Check long-term memory
    try {
      await fs.access(MEMORY_FILE);
      stats.longTermMemoryExists = true;
    } catch {
      stats.longTermMemoryExists = false;
    }
    
    // Check mem0 stats
    try {
      const mem0Data = await fs.readFile(MEM0_FILE, 'utf-8');
      const mem0Json = JSON.parse(mem0Data);
      
      stats.mem0Stats = {
        exists: true,
        memoryCount: mem0Json.memories?.length || 0,
        size: Buffer.byteLength(mem0Data, 'utf-8')
      };
    } catch {
      stats.mem0Stats.exists = false;
    }
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch memory stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memory stats' },
      { status: 500 }
    );
  }
}
