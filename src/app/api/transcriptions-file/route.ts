import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TRANSCRIPTIONS_DIR = '/mnt/openclaw/workspace/transcriptions';

function markdownToHtml(md: string, title: string): string {
  // Simple markdown-to-HTML converter (no external deps)
  let html = md;

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Headers: # H1, ## H2, ### H3
  html = html.replace(/^(### .+)$/gm, '<h3>$1</h3>').replace(/^### /gm, '');
  html = html.replace(/^(## .+)$/gm, '<h2>$1</h2>').replace(/^## /gm, '');
  html = html.replace(/^(# .+)$/gm, '<h1>$1</h1>').replace(/^# /gm, '');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Horizontal rules: ---
  html = html.replace(/^---$/gm, '<hr>');

  // Paragraphs: double newlines
  html = html.replace(/\n\n/g, '</p><p>');

  // Single newlines within paragraphs -> <br>
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph tags
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[123]>)/g, '$1');
  html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      background: #0d0d0f;
      color: #e8e8e8;
      line-height: 1.7;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: #f0f0f0;
      border-bottom: 1px solid #27272a;
      padding-bottom: 0.5rem;
    }
    h2 {
      font-size: 1.2rem;
      margin: 1.5rem 0 0.5rem;
      color: #d4d4d8;
    }
    h3 {
      font-size: 1.1rem;
      margin: 1.2rem 0 0.5rem;
      color: #a1a1aa;
    }
    p { margin: 0.5rem 0; }
    strong { color: #22c55e; }
    em { color: #a1a1aa; font-style: italic; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr {
      border: none;
      border-top: 1px solid #27272a;
      margin: 1.5rem 0;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 1.5rem;
      color: #71717a;
      text-decoration: none;
      font-size: 0.85rem;
    }
    .back-link:hover { color: #22c55e; }
  </style>
</head>
<body>
  <a href="/transcriptions" class="back-link">← Back to Transcriptions</a>
  ${html}
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');
  const format = searchParams.get('format'); // 'html' for rendered, 'raw' for plain text, default: json

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

    if (format === 'html') {
      const title = safeName.replace(/_(READABLE|script)?\.md$|\.txt$/, '').replace(/[-_]/g, ' ');
      const htmlContent = markdownToHtml(text, title);
      return new NextResponse(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (format === 'raw') {
      return new NextResponse(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Default: JSON
    return NextResponse.json({ text, filename: safeName });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}