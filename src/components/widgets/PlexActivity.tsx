'use client';

import React, { useState, useEffect } from 'react';

interface NowPlaying {
  title: string;
  show: string | null;
  season: string | null;
  type: string;
  user: string;
  player: string;
  thumb: string | null;
  progress: number;
}

interface RecentView {
  id: string;
  title: string;
  show: string | null;
  type: string;
  username: string;
  viewedAt: number;
  thumb: string | null;
}

interface PlexData {
  nowPlaying: NowPlaying[];
  recentWatches?: RecentView[];
  recentHistory?: RecentView[];
  stats: { totalSessions: number; recentViews: number };
}

export default function PlexActivity() {
  const [data, setData] = useState<PlexData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s for live sessions
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const res = await window.fetch('/api/plex/activity');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
        <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">🎬 Plex</h2>
        <div className="text-[#71717a] text-sm">Loading...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide">🎬 Plex</h2>
        <a href="/plex" className="text-[10px] text-[#5e6ad2] hover:text-[#6d79e0]">View all →</a>
      </div>

      {/* Now Playing */}
      {data.nowPlaying.length > 0 ? (
        <div className="space-y-2 mb-4">
          <div className="text-xs text-[#71717a] mb-1">Now Playing</div>
          {data.nowPlaying.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#0d0d0f] border border-[#27272a] rounded-md p-2">
              {item.thumb ? (
                <img src={item.thumb} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-[#27272a] flex items-center justify-center text-sm flex-shrink-0">
                  {item.type === 'movie' ? '🎥' : '📺'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white font-medium truncate">
                  {item.show ? `${item.show} — ` : ''}{item.title}
                </div>
                <div className="text-[10px] text-[#71717a]">
                  {item.user} · {item.player}
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4 text-[#71717a] text-sm">
          <div className="w-2 h-2 rounded-full bg-[#525252] flex-shrink-0" />
          Nothing playing
        </div>
      )}

      {/* Recent Watches */}
      {(data.recentWatches || data.recentHistory || []).length > 0 && (
        <div className="border-t border-[#27272a] pt-3">
          <div className="text-xs text-[#71717a] mb-2">Recently Watched</div>
          <div className="space-y-1.5">
            {(data.recentWatches || data.recentHistory || []).slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-[#525252]">
                  {item.viewedAt ? new Date(item.viewedAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                <span className="text-[#a1a1a1] truncate">
                  {item.show ? <span className="text-[#e8e8e8]">{item.show}</span> : null}{item.show ? ' — ' : ''}{item.title}
                </span>
                <span className="text-[10px] text-[#525252]">{item.type === 'movie' ? '🎥' : '📺'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}