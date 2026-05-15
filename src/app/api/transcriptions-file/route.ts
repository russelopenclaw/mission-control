import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TRANSCRIPTIONS_DIR = '/mnt/openclaw/workspace/transcriptions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');

  if (!filename) {
    return NextResponse.json({ error: 'file parameter required' }, { status: 400 });
  }

  // Sanitize - only allow .txt and .md files
  const safeName = path.basename(filename);
  if (!safeName.endsWith('.txt') && !safeName.endsWith('.md')) {
    return NextResponse.json({ error: 'Only .txt and .md files allowed' }, { status: 400 });
  }

  const filepath = path.join(TRANSCRIPTIONS_DIR, safeName);

  try {
    const text = await fs.readFile(filepath, 'utf-8');
    return NextResponse.json({ text, filename: safeName });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}