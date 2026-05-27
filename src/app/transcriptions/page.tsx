'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface Transcription {
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function TranscriptionsPage() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [fullText, setFullText] = useState<string>('');
  const [loadingText, setLoadingText] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  async function fetchTranscriptions() {
    setLoading(true);
    try {
      const res = await fetch('/api/transcriptions');
      const data = await res.json();
      if (data.error && !data.transcriptions?.length) {
        setError(data.error);
      }
      setTranscriptions(data.transcriptions || []);
    } catch {
      setError('Failed to load transcriptions');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch('/api/transcriptions-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setSubmitMessage({ type: 'success', text: data.message || 'Video transcribed successfully' });
        setVideoUrl('');
        // Refresh the transcriptions list to show the new one
        await fetchTranscriptions();
      } else {
        setSubmitMessage({ type: 'error', text: data.error || data.details || 'Failed to transcribe video' });
      }
    } catch {
      setSubmitMessage({ type: 'error', text: 'Failed to process video URL' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRename(filename: string) {
    try {
      const res = await fetch('/api/transcriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, displayName: editName }),
      });
      if (res.ok) {
        setTranscriptions(prev =>
          prev.map(t => (t.filename === filename ? { ...t, displayName: editName } : t))
        );
        setEditingFile(null);
      }
    } catch {
      // ignore
    }
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/transcriptions?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTranscriptions(prev => prev.filter(t => t.filename !== filename));
        if (expandedFile === filename) setExpandedFile(null);
      }
    } catch {
      // ignore
    }
  }

  async function handleExpand(t: Transcription) {
    if (expandedFile === t.filename) {
      setExpandedFile(null);
      setFullText('');
      return;
    }
    setExpandedFile(t.filename);
    setLoadingText(true);
    try {
      const fileToFetch = t.readableFilename || t.filename;
      const res = await fetch(`/api/transcriptions-file?file=${encodeURIComponent(fileToFetch)}`);
      if (res.ok) {
        const data = await res.json();
        setFullText(data.text || 'No content');
      } else {
        setFullText('Failed to load transcription text');
      }
    } catch {
      setFullText('Error loading text');
    } finally {
      setLoadingText(false);
    }
  }

  function renderMarkdown(text: string): string {
    let html = text;
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/^(### .+)$/gm, '<h3 class="text-base font-semibold text-[#d4d4d8] mt-3 mb-1">$1</h3>').replace(/^### /gm, '');
    html = html.replace(/^(## .+)$/gm, '<h2 class="text-lg font-semibold text-[#e8e8e8] mt-4 mb-1">$1</h2>').replace(/^## /gm, '');
    html = html.replace(/^(# .+)$/gm, '<h1 class="text-xl font-bold text-[#22c55e] mt-4 mb-2">$1</h1>').replace(/^# /gm, '');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#4ade80]">$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#3b82f6] hover:underline">$1</a>');
    html = html.replace(/^---$/gm, '<hr class="border-[#27272a] my-3" />');
    html = html.replace(/\n\n/g, '</p><p class="mb-2">');
    html = html.replace(/\n/g, '<br/>');
    html = `<p class="mb-2">${html}</p>`;
    html = html.replace(/<p class="mb-2"><\/p>/g, '');
    html = html.replace(/<p class="mb-2">(<h[123])/g, '$1');
    html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
    html = html.replace(/<p class="mb-2">(<hr)/g, '$1');
    return html;
  }

  function startEditing(filename: string, currentName: string) {
    setEditingFile(filename);
    setEditName(currentName);
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8e8] flex items-center gap-2">
              🎙️ Transcriptions
            </h1>
            <p className="text-sm text-[#888888] mt-1">
              Video and audio transcriptions
            </p>
          </div>
          <div className="text-xs text-[#71717a]">
            {transcriptions.length} file{transcriptions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Add Video URL Section */}
        <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-[#a1a1a1] mb-3 flex items-center gap-2">
            <span>🔗</span> Transcribe a Video
          </h2>
          <form onSubmit={handleSubmitUrl} className="flex gap-2">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setSubmitMessage(null);
              }}
              placeholder="Paste YouTube or Vimeo URL..."
              className="flex-1 bg-[#0d0d0f] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-[#e8e8e8] placeholder-[#525252] focus:outline-none focus:border-[#22c55e]/50 transition-colors"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !videoUrl.trim()}
              className="px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg text-sm text-[#22c55e] hover:bg-[#22c55e]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-3 h-3 border border-[#22c55e] border-t-transparent rounded-full"></div>
                  Transcribing...
                </>
              ) : (
                <>Transcribe</>
              )}
            </button>
          </form>
          {submitMessage && (
            <p className={`text-xs mt-2 ${submitMessage.type === 'success' ? 'text-[#22c55e]' : 'text-red-400'}`}>
              {submitMessage.type === 'success' ? '✓' : '✕'} {submitMessage.text}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full"></div>
            <span className="ml-3 text-[#888888]">Loading transcriptions...</span>
          </div>
        ) : transcriptions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎙️</div>
            <h2 className="text-lg font-medium text-[#e8e8e8] mb-2">No transcriptions yet</h2>
            <p className="text-sm text-[#888888] max-w-md mx-auto">
              Paste a YouTube or Vimeo URL above to transcribe a video.
              Transcriptions will appear here once processed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transcriptions.map((t) => (
              <div
                key={t.filename}
                className="bg-[#151518] border border-[#27272a] rounded-lg hover:border-[#333] transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {editingFile === t.filename ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(t.filename);
                              if (e.key === 'Escape') setEditingFile(null);
                            }}
                            className="bg-[#0d0d0f] border border-[#22c55e]/30 text-[#e8e8e8] rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-[#22c55e]"
                            autoFocus
                          />
                          <button onClick={() => handleRename(t.filename)} className="text-[#22c55e] hover:text-[#4ade80] text-sm px-2">✓</button>
                          <button onClick={() => setEditingFile(null)} className="text-[#888888] hover:text-[#e8e8e8] text-sm px-2">✕</button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-2 mb-1 cursor-pointer group"
                          onClick={() => startEditing(t.filename, t.displayName)}
                        >
                          <h3 className="text-[#e8e8e8] font-medium truncate">{t.displayName}</h3>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#888888] text-xs">✏️</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#71717a]">
                        <span>{formatDate(t.createdAt)}</span>
                        <span>{formatFileSize(t.size)}</span>
                        {t.duration && <span>⏱️ {formatDuration(t.duration)}</span>}
                        {t.language && <span>🌐 {t.language}</span>}
                        {t.model && <span>🤖 {t.model}</span>}
                      </div>

                      {t.textPreview && (
                        <p className="text-xs text-[#555555] mt-2 truncate">{t.textPreview}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {t.readableFilename && (
                        <a
                          href={`/api/transcriptions-file?file=${encodeURIComponent(t.readableFilename)}&format=html`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-[#0d0d0f] border border-[#22c55e]/30 rounded hover:border-[#22c55e] text-[#22c55e] transition-colors"
                        >
                          📖 Readable
                        </a>
                      )}
                      <button
                        onClick={() => handleExpand(t)}
                        className="text-xs px-3 py-1.5 bg-[#0d0d0f] border border-[#27272a] rounded hover:border-[#22c55e]/50 hover:text-[#22c55e] text-[#888888] transition-colors"
                      >
                        {expandedFile === t.filename ? 'Collapse' : 'View'}
                      </button>
                      <button
                        onClick={() => handleDelete(t.filename)}
                        className="text-xs px-3 py-1.5 bg-[#0d0d0f] border border-[#27272a] rounded hover:border-red-500/50 hover:text-red-400 text-[#888888] transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {expandedFile === t.filename && (
                  <div className="border-t border-[#27272a] bg-[#0d0d0f] p-4">
                    {loadingText ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin w-5 h-5 border-2 border-[#22c55e] border-t-transparent rounded-full"></div>
                        <span className="ml-2 text-[#888888] text-sm">Loading...</span>
                      </div>
                    ) : (
                      <>
                        {t.readableFilename ? (
                          <div
                            className="text-sm text-[#e8e8e8] leading-relaxed max-h-96 overflow-y-auto prose-invert"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(fullText) }}
                          />
                        ) : (
                          <pre className="text-sm text-[#e8e8e8] whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                            {fullText}
                          </pre>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}