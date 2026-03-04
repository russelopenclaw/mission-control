import { NextRequest, NextResponse } from 'next/server';
import { updateAgentStatus } from '@/lib/agent-status';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, status, currentTask } = body;

    // Validate required fields
    if (!agent || !status || !currentTask) {
      return NextResponse.json(
        { error: 'Missing required fields: agent, status, currentTask' },
        { status: 400 }
      );
    }

    // Validate status value
    if (status !== 'working' && status !== 'idle') {
      return NextResponse.json(
        { error: 'Invalid status. Must be "working" or "idle"' },
        { status: 400 }
      );
    }

    // Update agent status
    const result = await updateAgentStatus(agent, status, currentTask);

    if (result.success) {
      return NextResponse.json({ 
        success: true,
        message: `Agent ${agent} status updated to ${status}`
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to update agent status' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to update agent status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
