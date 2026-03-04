import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { calculateRuntime } from '@/lib/agent-status';

const SUBAGENTS_PATH = path.resolve(process.cwd(), '../kanban/subagents.json');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const content = await fs.readFile(SUBAGENTS_PATH, 'utf-8');
    const data = JSON.parse(content);

    // Search in active list first
    const active = (data.active || []).find((s: any) => s.runId === runId);
    if (active) {
      return NextResponse.json({
        ...active,
        runtime: calculateRuntime(active.startedAt)
      });
    }

    // Then search in recent list
    const recent = (data.recent || []).find((s: any) => s.runId === runId);
    if (recent) {
      return NextResponse.json({
        ...recent,
        runtime: calculateRuntime(recent.startedAt)
      });
    }

    return NextResponse.json(
      { error: 'Subagent not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Failed to get subagent status:', error);
    return NextResponse.json(
      { error: 'Subagent not found' },
      { status: 404 }
    );
  }
}
