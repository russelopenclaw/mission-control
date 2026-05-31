import { NextRequest, NextResponse } from 'next/server';
import { execSync, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';

const TRANSCRIPTIONS_DIR = '/mnt/openclaw/workspace/transcriptions';
const WHISPER_API = 'http://localhost:8777';

interface TranscriptionRequest {
  url: string;
  type?: 'video' | 'audio';
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Extract Google Drive file ID from various URL formats
function extractGDriveId(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  // https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  return null;
}

function isGDriveUrl(url: string): boolean {
  return /drive\.google\.com/.test(url);
}

function isDirectAudioUrl(url: string): boolean {
  return /\.(mp3|wav|m4a|ogg|flac|webm|aac)(\?.*)?$/i.test(url);
}

// Download audio file from URL
async function downloadAudio(url: string, tmpDir: string): Promise<{ filePath: string; originalName: string }> {
  await fs.mkdir(tmpDir, { recursive: true });

  // Google Drive
  if (isGDriveUrl(url)) {
    const fileId = extractGDriveId(url);
    if (!fileId) {
      throw new Error('Could not extract Google Drive file ID from URL. Use the "Share" link format: https://drive.google.com/file/d/FILE_ID/view');
    }
    const outputPath = path.join(tmpDir, `gdrive_${fileId.substring(0, 12)}`);
    // Try gdown first (handles large files & virus scan warnings)
    try {
      execSync(`gdown "${url}" -O "${outputPath}.mp3" 2>&1`, { timeout: 300000, encoding: 'utf-8' });
      const files = await fs.readdir(tmpDir);
      const downloaded = files.find(f => f.startsWith('gdrive_'));
      if (downloaded) {
        return { filePath: path.join(tmpDir, downloaded), originalName: downloaded };
      }
    } catch {
      // gdown failed, try direct download
    }
    // Fallback: direct download via curl
    try {
      execSync(`curl -L -o "${outputPath}.mp3" "https://drive.google.com/uc?export=download&id=${fileId}" 2>&1`, {
        timeout: 300000, encoding: 'utf-8'
      });
      return { filePath: `${outputPath}.mp3`, originalName: `gdrive_${fileId.substring(0, 12)}.mp3` };
    } catch (e) {
      throw new Error('Failed to download from Google Drive. The file may be too large or access-restricted. Try making the file publicly accessible.');
    }
  }

  // Direct audio URL
  if (isDirectAudioUrl(url)) {
    const ext = url.match(/\.(mp3|wav|m4a|ogg|flac|webm|aac)(\?.*)?$/i)?.[1] || 'mp3';
    const outputPath = path.join(tmpDir, `audio_download.${ext}`);
    execSync(`curl -L -o "${outputPath}" "${url}" 2>&1`, { timeout: 300000, encoding: 'utf-8' });
    return { filePath: outputPath, originalName: `audio_download.${ext}` };
  }

  // Try yt-dlp for anything else (might be a video site)
  try {
    execSync(`yt-dlp -x --audio-format mp3 -o "${path.join(tmpDir, 'audio.%(ext)s')}" "${url}" 2>&1`, {
      timeout: 300000, encoding: 'utf-8'
    });
    const files = await fs.readdir(tmpDir);
    const audioFile = files.find(f => f.startsWith('audio.'));
    if (audioFile) {
      return { filePath: path.join(tmpDir, audioFile), originalName: audioFile };
    }
  } catch {
    // yt-dlp couldn't handle it
  }

  throw new Error('Unsupported URL format. Please provide a Google Drive link, direct audio URL (mp3/wav/m4a), or YouTube/Vimeo URL.');
}

// Check if Whisper API is available
async function checkWhisperAPI(): Promise<{ available: boolean; model?: string; error?: string }> {
  return new Promise((resolve) => {
    const req = http.get(`${WHISPER_API}/health`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ available: data.status === 'ok', model: data.model });
        } catch {
          resolve({ available: false, error: 'Invalid health response' });
        }
      });
    });
    req.on('error', () => resolve({ available: false, error: 'Whisper API not reachable' }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ available: false, error: 'Whisper API timeout' }); });
  });
}

// Get audio duration using ffprobe
function getAudioDuration(filePath: string): number | null {
  try {
    const output = execSync(
      `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv=p=0 2>/dev/null`,
      { encoding: 'utf-8', timeout: 10000 }
    );
    return parseFloat(output.trim()) || null;
  } catch {
    return null;
  }
}

// Transcribe audio file via local Whisper API
async function transcribeWithWhisper(audioPath: string): Promise<{
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
  language: string;
  duration: number;
}> {
  const audioData = await fs.readFile(audioPath);
  const ext = path.extname(audioPath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg', '.webm': 'audio/webm', '.flac': 'audio/flac',
    '.aac': 'audio/aac',
  };

  return new Promise((resolve, reject) => {
    const req = http.request(`${WHISPER_API}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': contentTypes[ext] || 'audio/wav',
        'Content-Length': audioData.length,
      },
      timeout: 1800000, // 30 min
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error) {
            reject(new Error(data.error));
            return;
          }
          resolve(data);
        } catch (e) {
          reject(new Error(`Parse error: ${body.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Whisper API request timed out')); });
    req.write(audioData);
    req.end();
  });
}

// Transcribe with chunking for long files
async function transcribeWithChunking(audioPath: string, chunkMinutes: number = 15): Promise<{
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
  language: string;
  duration: number;
}> {
  const chunkDir = require('fs').mkdtempSync('/tmp/whisper-chunks-');
  const chunkDurationSec = chunkMinutes * 60;
  const ext = path.extname(audioPath);

  try {
    execSync(
      `ffmpeg -i "${audioPath}" -f segment -segment_time ${chunkDurationSec} -c copy "${chunkDir}/chunk_%03d${ext}" -y 2>/dev/null`,
      { timeout: 60000 }
    );
  } catch {
    // Try with re-encoding
    execSync(
      `ffmpeg -i "${audioPath}" -f segment -segment_time ${chunkDurationSec} -ar 16000 -ac 1 "${chunkDir}/chunk_%03d.wav" -y 2>/dev/null`,
      { timeout: 60000 }
    );
  }

  const chunks = (await fs.readdir(chunkDir))
    .filter(f => f.startsWith('chunk_'))
    .sort()
    .map(f => path.join(chunkDir, f));

  if (chunks.length === 0) {
    throw new Error('Failed to split audio into chunks');
  }

  const allSegments: Array<{ start: number; end: number; text: string }> = [];
  const textParts: string[] = [];
  let totalDuration = 0;
  let detectedLanguage = 'en';

  for (let i = 0; i < chunks.length; i++) {
    const chunkResult = await transcribeWithWhisper(chunks[i]);
    const offset = totalDuration;

    for (const seg of (chunkResult.segments || [])) {
      allSegments.push({
        start: Math.round((seg.start + offset) * 100) / 100,
        end: Math.round((seg.end + offset) * 100) / 100,
        text: seg.text,
      });
    }

    textParts.push(chunkResult.text);
    totalDuration += chunkResult.duration || 0;
    if (chunkResult.language) detectedLanguage = chunkResult.language;

    // Cleanup chunk
    await fs.unlink(chunks[i]).catch(() => {});
  }

  await fs.rmdir(chunkDir).catch(() => {});

  return {
    text: textParts.join(' '),
    segments: allSegments,
    language: detectedLanguage,
    duration: totalDuration,
  };
}

// Process an audio file: transcribe and create output files
async function processAudioFile(
  audioPath: string,
  originalName: string,
  sourceUrl: string,
  sourceType: string,
  customTitle?: string
): Promise<{ files: { txt: string; readable: string; meta: string }; title: string; duration: number }> {
  // Get duration
  const duration = getAudioDuration(audioPath) || 0;
  const title = customTitle || originalName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

  // Sanitize filename
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60);
  const baseFilename = `${dateStr}_${safeName}`;

  // Decide: chunk or direct
  const durationMin = duration / 60;
  let result;

  if (duration > 30 * 60) {
    // Long file: chunk it
    result = await transcribeWithChunking(audioPath, 15);
  } else {
    result = await transcribeWithWhisper(audioPath);
  }

  // Format raw transcript with timestamps
  const rawLines: string[] = [];
  if (result.segments && result.segments.length > 0) {
    for (const seg of result.segments) {
      const mins = Math.floor(seg.start / 60);
      const secs = Math.floor(seg.start % 60);
      rawLines.push(`[${mins}:${secs.toString().padStart(2, '0')}] ${seg.text}`);
    }
  }
  const rawText = rawLines.length > 0 ? rawLines.join('\n') : result.text;

  // Create readable markdown
  let readableText = rawLines.length > 0
    ? rawLines.map(line => line.replace(/^\[\d{2}:\d{2}\]\s*/, '')).join(' ').replace(/\s+/g, ' ').trim()
    : result.text;

  // Split into paragraphs
  const sentences = readableText.match(/[^.!?]+[.!?]+/g) || [readableText];
  const paragraphs: string[] = [];
  let currentParagraph = '';
  for (const sentence of sentences) {
    currentParagraph += sentence.trim() + ' ';
    if ((currentParagraph.match(/[.!?]/g) || []).length >= 4) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = '';
    }
  }
  if (currentParagraph.trim()) paragraphs.push(currentParagraph.trim());

  const readableMd = `# ${title}

**Source:** [${sourceType}](${sourceUrl})
**Duration:** ${formatDuration(duration)}
**Transcription:** Whisper AI (full audio coverage)

---

${paragraphs.join('\n\n')}
`;

  // Write files
  const txtPath = path.join(TRANSCRIPTIONS_DIR, `${baseFilename}.txt`);
  const readablePath = path.join(TRANSCRIPTIONS_DIR, `${baseFilename}_READABLE.md`);
  const metaPath = path.join(TRANSCRIPTIONS_DIR, `${baseFilename}.meta.json`);

  await fs.writeFile(txtPath, rawText);
  await fs.writeFile(readablePath, readableMd);
  await fs.writeFile(metaPath, JSON.stringify({
    displayName: title,
    originalName: originalName,
    sourceUrl,
    createdAt: new Date().toISOString(),
    duration,
    language: result.language || 'en',
    model: 'whisper-ai',
    type: sourceType,
  }, null, 2));

  return {
    files: {
      txt: `${baseFilename}.txt`,
      readable: `${baseFilename}_READABLE.md`,
      meta: `${baseFilename}.meta.json`,
    },
    title,
    duration,
  };
}

// ============================================================
// POST handler
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TranscriptionRequest;
    const { url, type } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    await fs.mkdir(TRANSCRIPTIONS_DIR, { recursive: true });

    // ---- AUDIO URL (Google Drive, direct MP3, etc.) ----
    if (type === 'audio' || isGDriveUrl(url) || isDirectAudioUrl(url)) {
      // Check Whisper API first
      const whisper = await checkWhisperAPI();
      if (!whisper.available) {
        return NextResponse.json({
          error: 'Whisper transcription API is not running. Please start it with: systemctl --user start whisper-api',
          details: whisper.error,
        }, { status: 503 });
      }

      const tmpDir = `/tmp/transcription_audio_${Date.now()}`;
      let audioPath: string;
      let originalName: string;
      let sourceType: string;

      try {
        const download = await downloadAudio(url, tmpDir);
        audioPath = download.filePath;
        originalName = download.originalName;
        sourceType = isGDriveUrl(url) ? 'Google Drive' : 'Audio File';
      } catch (err) {
        return NextResponse.json({
          error: err instanceof Error ? err.message : 'Failed to download audio file',
        }, { status: 400 });
      }

      try {
        const result = await processAudioFile(audioPath, originalName, url, sourceType);

        // Cleanup
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

        return NextResponse.json({
          success: true,
          message: `Transcribed "${result.title}" successfully`,
          files: result.files,
          title: result.title,
          duration: result.duration,
        });
      } catch (err) {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        return NextResponse.json({
          error: 'Transcription failed',
          details: err instanceof Error ? err.message : String(err),
        }, { status: 500 });
      }
    }

    // ---- VIDEO URL (YouTube, Vimeo) ----
    const videoPatterns = [
      /youtube\.com\/watch/,
      /youtu\.be\//,
      /vimeo\.com\//,
      /youtube\.com\/shorts\//,
    ];

    const isVideoUrl = videoPatterns.some(p => p.test(url));
    if (!isVideoUrl) {
      return NextResponse.json({
        error: 'URL must be a YouTube/Vimeo video, Google Drive audio link, or direct audio URL (.mp3/.wav/.m4a/.ogg/.flac)',
      }, { status: 400 });
    }

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
    const dateStr = new Date().toISOString().split('T')[0];
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
      execSync(
        `yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format json3 -o "${tmpDir}/subs" "${url}" 2>/dev/null`,
        { timeout: 60000, encoding: 'utf-8' }
      );
      const tmpFiles = await fs.readdir(tmpDir);
      const subFile = tmpFiles.find(f => f.endsWith('.json3'));
      if (subFile) {
        captionData = await fs.readFile(path.join(tmpDir, subFile), 'utf-8');
      }
    } catch {
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
      } catch { /* both failed */ }
    }

    if (!captionData) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      return NextResponse.json({
        error: 'Could not download captions for this video. It may not have subtitles available.',
        title,
      }, { status: 400 });
    }

    // Parse json3 captions
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
    if (currentText.trim()) {
      const mins = Math.floor(currentTime / 60000);
      const secs = Math.floor((currentTime % 60000) / 1000);
      rawLines.push(`[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}] ${currentText.trim()}`);
    }

    const rawText = rawLines.join('\n');

    // Create readable markdown
    let readableText = rawLines
      .map(line => line.replace(/^\[\d{2}:\d{2}\]\s*/, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = readableText.match(/[^.!?]+[.!?]+/g) || [readableText];
    const paragraphs: string[] = [];
    let currentParagraph = '';
    for (const sentence of sentences) {
      currentParagraph += sentence.trim() + ' ';
      if ((currentParagraph.match(/[.!?]/g) || []).length >= 4) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
    }
    if (currentParagraph.trim()) paragraphs.push(currentParagraph.trim());

    const readableMd = `# ${title}

**Source:** [YouTube](${url})
**Duration:** ${formatDuration(duration)}
**Transcription:** YouTube auto-captions (full video coverage)

---

${paragraphs.join('\n\n')}
`;

    // Write files
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

// GET returns empty queue for backward compatibility
export async function GET() {
  return NextResponse.json({ queue: [] });
}

// DELETE for backward compatibility
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove from queue' }, { status: 500 });
  }
}