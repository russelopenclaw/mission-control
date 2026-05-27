import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const TRANSCRIPTIONS_DIR = '/mnt/openclaw/workspace/transcriptions';
const WORKSPACE_DIR = '/home/kevin/.openclaw/workspace';

interface TranscriptionRequest {
  url: string;
}

// Process a video URL directly - download captions and create transcription files
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TranscriptionRequest;
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Validate it looks like a video URL
    const videoPatterns = [
      /youtube\.com\/watch/,
      /youtu\.be\//,
      /vimeo\.com\//,
      /youtube\.com\/shorts\//,
    ];

    const isVideoUrl = videoPatterns.some(p => p.test(url));
    if (!isVideoUrl) {
      return NextResponse.json({ 
        error: 'URL must be a YouTube, Vimeo, or similar video link' 
      }, { status: 400 });
    }

    // Ensure transcriptions directory exists
    await fs.mkdir(TRANSCRIPTIONS_DIR, { recursive: true });

    // Extract video ID for YouTube
    let videoId = '';
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      videoId = ytMatch[1];
    }

    // Get video title and duration
    let title = 'Unknown Video';
    let duration = 0;
    try {
      const titleOutput = execSync(
        `yt-dlp --print title --print duration "${url}" 2>/dev/null`,
        { timeout: 30000, encoding: 'utf-8' }
      ).trim();
      const lines = titleOutput.split('\n').filter(Boolean);
      if (lines.length >= 2) {
        title = lines[0];
        duration = parseInt(lines[1]) || 0;
      } else if (lines.length === 1) {
        title = lines[0];
      }
    } catch {
      // yt-dlp failed, continue with defaults
    }

    // Sanitize title for filename
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const safeName = title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 60);
    const baseFilename = `${dateStr}_${safeName}`;

    // Download YouTube captions (json3 format for processing)
    const tmpDir = `/tmp/transcription_${videoId || Date.now()}`;
    await fs.mkdir(tmpDir, { recursive: true });

    let captionMethod = 'youtube-captions';
    let captionData: string | null = null;

    try {
      // Try YouTube auto-captions first (fastest, free)
      execSync(
        `yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format json3 -o "${tmpDir}/subs" "${url}" 2>/dev/null`,
        { timeout: 60000, encoding: 'utf-8' }
      );

      // Find the downloaded subtitle file
      const tmpFiles = await fs.readdir(tmpDir);
      const subFile = tmpFiles.find(f => f.endsWith('.json3'));
      if (subFile) {
        captionData = await fs.readFile(path.join(tmpDir, subFile), 'utf-8');
      }
    } catch {
      // Auto-captions failed, try manual subtitles
      try {
        execSync(
          `yt-dlp --write-sub --sub-lang en --skip-download --sub-format json3 -o "${tmpDir}/subs" "${url}" 2>/dev/null`,
          { timeout: 60000, encoding: 'utf-8' }
        );
        const tmpFiles = await fs.readdir(tmpDir);
        const subFile = tmpFiles.find(f => f.endsWith('.json3'));
        if (subFile) {
          captionData = await fs.readFile(path.join(tmpDir, subFile), 'utf-8');
        }
      } catch {
        // Both caption methods failed
      }
    }

    if (!captionData) {
      // Clean up temp dir
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      return NextResponse.json({
        error: 'Could not download captions for this video. It may not have subtitles available.',
        title,
      }, { status: 400 });
    }

    // Parse json3 captions into raw timestamped text
    const parsed = JSON.parse(captionData);
    const events = parsed.events || [];
    
    let rawLines: string[] = [];
    let currentText = '';
    let currentTime = 0;

    for (const event of events) {
      if (event.segs) {
        const text = event.segs.map((s: { utf8?: string }) => s.utf8 || '').join('');
        if (text.trim()) {
          if (currentText && !text.startsWith(' ') && !text.startsWith('\n')) {
            // New segment - flush previous
            const mins = Math.floor(currentTime / 60000);
            const secs = Math.floor((currentTime % 60000) / 1000);
            rawLines.push(`[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}] ${currentText.trim()}`);
            currentText = text;
            currentTime = event.tStartMs || 0;
          } else {
            currentText += text;
            if (!currentTime) currentTime = event.tStartMs || 0;
          }
        }
      }
    }
    // Flush last segment
    if (currentText.trim()) {
      const mins = Math.floor(currentTime / 60000);
      const secs = Math.floor((currentTime % 60000) / 1000);
      rawLines.push(`[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}] ${currentText.trim()}`);
    }

    const rawText = rawLines.join('\n');

    // Create readable markdown - clean up captions into flowing prose
    let readableText = rawLines
      .map(line => line.replace(/^\[\d{2}:\d{2}\]\s*/, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into paragraphs at natural breaks (every ~3-4 sentences)
    const sentences = readableText.match(/[^.!?]+[.!?]+/g) || [readableText];
    const paragraphs: string[] = [];
    let currentParagraph = '';
    
    for (const sentence of sentences) {
      currentParagraph += sentence.trim() + ' ';
      // Start new paragraph every 4 sentences
      if ((currentParagraph.match(/[.!?]/g) || []).length >= 4) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
    }
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }

    const readableMd = `# ${title}

**Source:** [YouTube](${url})
**Duration:** ${formatDuration(duration)}
**Transcription:** YouTube auto-captions (full video coverage)

---

${paragraphs.map(p => p).join('\n\n')}
`;

    // Write all three files
    const txtPath = path.join(TRANSCRIPTIONS_DIR, `${baseFilename}.txt`);
    const readablePath = path.join(TRANSCRIPTIONS_DIR, `${baseFilename}_READABLE.md`);
    const metaPath = path.join(TRANSCRIPTIONS_DIR, `${baseFilename}.meta.json`);

    await fs.writeFile(txtPath, rawText);
    await fs.writeFile(readablePath, readableMd);
    await fs.writeFile(metaPath, JSON.stringify({
      displayName: title,
      originalName: videoId ? `youtube_${videoId}` : url,
      sourceUrl: url,
      createdAt: new Date().toISOString(),
      duration,
      language: 'en',
      model: captionMethod,
      type: 'youtube-video',
    }, null, 2));

    // Clean up temp dir
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Transcribed "${title}" successfully`,
      files: {
        txt: `${baseFilename}.txt`,
        readable: `${baseFilename}_READABLE.md`,
        meta: `${baseFilename}.meta.json`,
      },
      title,
      duration,
    });
  } catch (error) {
    console.error('Error processing transcription:', error);
    return NextResponse.json({ 
      error: 'Failed to process transcription',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// GET still returns queue (empty) for backward compatibility
export async function GET() {
  return NextResponse.json({ queue: [] });
}

// DELETE still works for removing items
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
    }

    // No-op since we don't use queue anymore, but return success for compatibility
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove from queue' }, { status: 500 });
  }
}