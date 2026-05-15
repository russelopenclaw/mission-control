'use client';

import React, { useState, useEffect } from 'react';

interface NowPlaying {
  user: string;
  title: string;
  show?: string;
  type: string;
  progress: number;
  duration: number;
  player: string;
  state: string;
}

export default function PlexNowPlaying() {
  const [sessions, setSessions] = useState<NowPlaying[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 15000); // 15s for near-real-time
    return () => clearInterval(interval);
  }, []);

  async function fetchNowPlaying() {
    try {
      const res = await fetch('/api/plex/activity');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.nowPlaying || []);
      }
    } catch {
      // Plex unreachable
    }
    setLoading(false);
  }

  return (
    <div className="bg-[#151518] rounded-lg border border-[#27272a] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#e8e8e8] flex items-center gap-2">
          📺 Now Playing
          {sessions.length > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-green-100 bg-green-600 rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </h3>
        <button
          onClick={fetchNowPlaying}
          className="text-xs text-[#71717a] hover:text-[#e8e8e8] transition-colors"
        >
          ↻
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-[#27272a] rounded-md" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-6">
          <span className="text-2xl">💤</span>
          <p className="text-sm text-[#71717a] mt-2">Nobody's watching right now</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <div key={i} className="bg-[#0d0d0f] rounded-lg p-3 border border-[#22c55e]/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-xs font-bold text-[#22c55e]">
                  {session.user?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8e8e8] truncate">
                    {session.show ? `${session.show}: ${session.title}` : session.title}
                  </p>
                  <p className="text-xs text-[#71717a]">
                    {session.user} · {session.player}
                    {session.state === 'paused' && ' · ⏸ Paused'}
                  </p>
                </div>
              </div>
              {session.duration > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#e5a00d] rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min((session.progress / session.duration) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-[#52525b]">{formatTime(session.progress)}</span>
                    <span className="text-xs text-[#52525b]">{formatTime(session.duration)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}:${(mins % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  return `${mins}:${(seconds % 60).toString().padStart(2, '0')}`;
}