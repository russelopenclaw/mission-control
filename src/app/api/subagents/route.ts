import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { calculateRuntime } from '@/lib/agent-status';

const SUBAGENTS_PATH = path.resolve(process.cwd(), '../kanban/subagents.json');

export async function GET() {
  try {
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);

    // Calculate runtime for all active subagents
    const active = (data.active || []).map((subagent: any) => ({
      ...subagent,
      runtime: calculateRuntime(subagent.startedAt)
    }));

    // Calculate runtime for recent subagents
    const recent = (data.recent || []).map((subagent: any) => ({
      ...subagent,
      runtime: calculateRuntime(subagent.startedAt)
    }));

    return NextResponse.json({
      active,
      recent
    });
  } catch (error) {
    console.error('Failed to read subagent status:', error);
    // Return empty lists if file doesn't exist
    return NextResponse.json({ active: [], recent: [] });
  }
}
