import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const KANBAN_PATH = path.resolve(process.cwd(), '../kanban/tasks.json');

export async function GET() {
  try {
    const content = await fs.readFile(KANBAN_PATH, 'utf-8');
    const data = JSON.parse(content);
    
    // Return agents object from kanban/tasks.json
    return NextResponse.json({
      agents: data.agents || {}
    });
  } catch (error) {
    console.error('Failed to read agent status:', error);
    // Return empty agents if file doesn't exist
    return NextResponse.json({ agents: {} });
  }
}
