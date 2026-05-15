import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TRANSCRIPTIONS_DIR = '/mnt/openclaw/workspace/transcriptions';

interface TranscriptionMeta {
  filename: string;
  originalName: string;
  displayName: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  duration?: number;
  language?: string;
  model?: string;
  textPreview?: string;
  readableFilename?: string;
}

async function readMetadata(filepath: string, filename: string): Promise<TranscriptionMeta> {
  const stat = await fs.stat(filepath);
  
  // Try to read the companion JSON metadata file
  const metaPath = filepath.replace(/\.txt$/, '.meta.json');
  let meta: Record<string, unknown> = {};
  try {
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    meta = JSON.parse(metaContent);
  } catch {
    // No metadata file - that's fine
  }

  // Read text preview (first 200 chars)
  let textPreview = '';
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    textPreview = content.substring(0, 200).replace(/\n/g, ' ');
  } catch {
    // Not a text file
  }

  // Generate display name from filename
  // Pattern: 2026-05-15_meeting-with-john.txt or just filename
  const baseName = filename.replace(/\.txt$/, '');
  const displayName = (meta.displayName as string) || baseName.replace(/[-_]/g, ' ').replace(/^\d{4}-\d{2}-\d{2}\s*/, '');

  // Check for readable format companion file
  const readableFilename = filename.replace(/\.txt$/, '_READABLE.md');
  const readablePath = path.join(TRANSCRIPTIONS_DIR, readableFilename);
  let hasReadable = false;
  try {
    await fs.access(readablePath);
    hasReadable = true;
  } catch {}

  return {
    filename,
    originalName: (meta.originalName as string) || filename,
    displayName,
    size: stat.size,
    createdAt: meta.createdAt as string || stat.birthtime.toISOString(),
    modifiedAt: stat.mtime.toISOString(),
    duration: meta.duration as number | undefined,
    language: meta.language as string | undefined,
    model: meta.model as string | undefined,
    textPreview,
    readableFilename: hasReadable ? readableFilename : undefined,
  };
}

export async function GET() {
  try {
    await fs.access(TRANSCRIPTIONS_DIR);
  } catch {
    return NextResponse.json({ transcriptions: [], error: 'Transcriptions directory not accessible' });
  }

  try {
    const files = await fs.readdir(TRANSCRIPTIONS_DIR);
    const txtFiles = files.filter(f => f.endsWith('.txt')).sort().reverse();
    
    const transcriptions: TranscriptionMeta[] = [];
    for (const file of txtFiles) {
      const filepath = path.join(TRANSCRIPTIONS_DIR, file);
      const meta = await readMetadata(filepath, file);
      transcriptions.push(meta);
    }

    return NextResponse.json({ transcriptions });
  } catch (error) {
    console.error('Error reading transcriptions:', error);
    return NextResponse.json({ transcriptions: [], error: 'Failed to read transcriptions' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, displayName } = body;

    if (!filename || !displayName) {
      return NextResponse.json({ error: 'filename and displayName required' }, { status: 400 });
    }

    // Sanitize filename - only allow .txt files in transcriptions dir
    const safeName = path.basename(filename);
    if (!safeName.endsWith('.txt')) {
      return NextResponse.json({ error: 'Only .txt files allowed' }, { status: 400 });
    }

    const metaPath = path.join(TRANSCRIPTIONS_DIR, safeName.replace(/\.txt$/, '.meta.json'));
    
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    } catch {
      // Create new metadata
    }

    meta.displayName = displayName;
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

    return NextResponse.json({ success: true, displayName });
  } catch (error) {
    console.error('Error updating transcription:', error);
    return NextResponse.json({ error: 'Failed to update transcription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'filename required' }, { status: 400 });
    }

    const safeName = path.basename(filename);
    if (!safeName.endsWith('.txt')) {
      return NextResponse.json({ error: 'Only .txt files allowed' }, { status: 400 });
    }

    const txtPath = path.join(TRANSCRIPTIONS_DIR, safeName);
    const metaPath = path.join(TRANSCRIPTIONS_DIR, safeName.replace(/\.txt$/, '.meta.json'));

    await fs.unlink(txtPath).catch(() => {});
    await fs.unlink(metaPath).catch(() => {});
    // Also delete readable format if exists
    const readablePath = path.join(TRANSCRIPTIONS_DIR, safeName.replace(/\.txt$/, '_READABLE.md'));
    await fs.unlink(readablePath).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transcription:', error);
    return NextResponse.json({ error: 'Failed to delete transcription' }, { status: 500 });
  }
}