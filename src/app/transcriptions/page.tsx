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
    } catch (err) {
      setError('Failed to load transcriptions');
    } finally {
      setLoading(false);
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

  async function handleExpand(filename: string) {
    if (expandedFile === filename) {
      setExpandedFile(null);
      setFullText('');
      return;
    }
    setExpandedFile(filename);
    setLoadingText(true);
    try {
      const res = await fetch(`/api/transcriptions-file?file=${encodeURIComponent(filename)}`);
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
              Voice meeting transcriptions powered by local Whisper
            </p>
          </div>
          <div className="text-xs text-[#71717a]">
            {transcriptions.length} file{transcriptions.length !== 1 ? 's' : ''}
          </div>
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
              Send an audio file to Alfred via Telegram and it will be transcribed automatically. 
              Transcriptions appear here once processed.
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
                      {/* Name - editable */}
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
                          <button
                            onClick={() => handleRename(t.filename)}
                            className="text-[#22c55e] hover:text-[#4ade80] text-sm px-2"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingFile(null)}
                            className="text-[#888888] hover:text-[#e8e8e8] text-sm px-2"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-2 mb-1 cursor-pointer group"
                          onClick={() => startEditing(t.filename, t.displayName)}
                        >
                          <h3 className="text-[#e8e8e8] font-medium truncate">
                            {t.displayName}
                          </h3>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#888888] text-xs">
                            ✏️
                          </span>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#71717a]">
                        <span>{formatDate(t.createdAt)}</span>
                        <span>{formatFileSize(t.size)}</span>
                        {t.duration && <span>⏱️ {formatDuration(t.duration)}</span>}
                        {t.language && <span>🌐 {t.language}</span>}
                        {t.model && <span>🤖 {t.model}</span>}
                      </div>

                      {/* Preview text */}
                      {t.textPreview && (
                        <p className="text-xs text-[#555555] mt-2 truncate">
                          {t.textPreview}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {t.readableFilename && (
                        <a
                          href={`/api/transcriptions-file?file=${encodeURIComponent(t.readableFilename)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-[#0d0d0f] border border-[#22c55e]/30 rounded hover:border-[#22c55e] text-[#22c55e] transition-colors"
                        >
                          📖 Readable
                        </a>
                      )}
                      <button
                        onClick={() => handleExpand(t.filename)}
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

                {/* Expanded content */}
                {expandedFile === t.filename && (
                  <div className="border-t border-[#27272a] bg-[#0d0d0f] p-4">
                    {loadingText ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin w-5 h-5 border-2 border-[#22c55e] border-t-transparent rounded-full"></div>
                        <span className="ml-2 text-[#888888] text-sm">Loading...</span>
                      </div>
                    ) : (
                      <pre className="text-sm text-[#e8e8e8] whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                        {fullText}
                      </pre>
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