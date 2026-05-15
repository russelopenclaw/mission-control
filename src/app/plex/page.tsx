'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface NowPlaying {
  user: number;
  title: string;
  show: string | null;
  progress: number;
  player: any;
}

interface RecentWatch {
  id: string;
  title: string;
  show: string | null;
  type: string;
  viewedAt: number;
  username: string;
  duration: number;
}

interface TopShow {
  show: string;
  count: number;
  lastWatched: number;
}

interface UserSummary {
  username: string;
  totalViews: number;
  lastActivity: string | null;
}

interface LibraryStats {
  totalShows: number;
  totalMovies: number;
}

interface PlexActivity {
  nowPlaying: NowPlaying[];
  recentWatches: RecentWatch[];
  topShowsThisWeek: TopShow[];
  userSummary: UserSummary[];
  libraryStats: LibraryStats;
  error: boolean;
  errorMessage: string | null;
}

export default function PlexPage() {
  const [activity, setActivity] = useState<PlexActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch('/api/plex/activity', { cache: 'no-store' });
      const data = await response.json();
      
      if (data.error) {
        setError(data.errorMessage || 'Failed to fetch Plex activity');
        setActivity({
          nowPlaying: [],
          recentWatches: [],
          topShowsThisWeek: [],
          userSummary: [],
          libraryStats: { totalShows: 0, totalMovies: 0 },
          error: true,
          errorMessage: data.errorMessage,
        });
      } else {
        setError(null);
        setActivity(data);
      }
    } catch (err) {
      console.error('Failed to fetch Plex activity:', err);
      setError('Failed to connect to Plex server');
      setActivity(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActivity();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchActivity, 60000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  const formatTimeAgo = (timestamp: number | string | null): string => {
    if (!timestamp) return 'Unknown';
    
    try {
      // Normalize to milliseconds
      let timeMs: number;
      if (typeof timestamp === 'number') {
        // Detect if seconds (Plex) vs milliseconds (JS) — if < 1e12 it's seconds
        timeMs = timestamp > 1e12 ? timestamp : timestamp * 1000;
      } else {
        // ISO string or date string
        timeMs = new Date(timestamp).getTime();
        if (isNaN(timeMs)) return 'Unknown';
      }
      
      const now = Date.now();
      const diffSeconds = Math.floor((now - timeMs) / 1000);
      
      if (diffSeconds < 0) return 'Just now';
      if (diffSeconds < 60) return 'Just now';
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
      return `${Math.floor(diffSeconds / 86400)}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressColor = (progress: number): string => {
    if (progress < 30) return 'bg-[#22c55e]'; // Green
    if (progress < 70) return 'bg-[#eab308]'; // Yellow
    return 'bg-[#ef4444]'; // Red
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Plex Activity</h1>
            <span className="bg-[#22c55e]/10 text-[#22c55e] px-3 py-1 rounded-full text-xs font-medium">
              Auto-refresh: 60s
            </span>
          </div>
          <p className="text-gray-400">Live streaming and viewing activity</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[#888888]">Fetching Plex activity...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-[#7f1d1d]/20 border border-[#7f1d1d] rounded-lg p-6">
            <h2 className="text-[#f87171] font-medium mb-2">Connection Error</h2>
            <p className="text-[#a1a1a1]">{error}</p>
            <button
              onClick={fetchActivity}
              className="mt-4 bg-[#5e6ad2] hover:bg-[#4f5bb5] text-white px-4 py-2 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        ) : activity ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Now Playing Card */}
            <div className="bg-[#151518] border border-[#27272a] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
                  Now Playing
                </h2>
                <span className="text-xs text-[#888888]">
                  {activity.nowPlaying.length} session{activity.nowPlaying.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {activity.nowPlaying.length === 0 ? (
                <div className="py-8 text-center text-[#888888]">
                  No active sessions
                </div>
              ) : (
                <div className="space-y-4">
                  {activity.nowPlaying.map((session, idx) => (
                    <div key={idx} className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-white font-medium">{session.title}</h3>
                          {session.show && <p className="text-xs text-[#888888]">{session.show}</p>}
                        </div>
                        <span className="text-xs text-[#a1a1a1]">
                          {session.user} user{session.user !== 1 ? 's' : ''} · {typeof session.player === 'string' ? session.player : ''}
                        </span>
                      </div>
                      
                      <div className="w-full bg-[#27272a] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getProgressColor(session.progress || 0)}`}
                          style={{ width: `${(session.progress || 0).toFixed(0)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-[#888888] mt-1 text-right">
                        {(session.progress || 0).toFixed(0)}% complete
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Watches Card */}
            <div className="bg-[#151518] border border-[#27272a] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent Watches</h2>
                <span className="text-xs text-[#888888]">
                  Last 20 items
                </span>
              </div>
              
              {activity.recentWatches.length === 0 ? (
                <div className="py-8 text-center text-[#888888]">
                  No recent activity
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.recentWatches.slice(0, 20).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-[#0d0d0f] border border-[#27272a] rounded-lg p-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                        item.type === 'episode' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#f87171]/20 text-[#f87171]'
                      }`}>
                        {item.type === 'episode' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.title}</p>
                        {item.show && <p className="text-xs text-[#888888] truncate">{item.show}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#a1a1a1]">{item.username}</span>
                          <span className="text-[#888888]">•</span>
                          <span className="text-xs text-[#888888]">{formatTimeAgo(item.viewedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Shows This Week */}
            <div className="bg-[#151518] border border-[#27272a] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Top Shows This Week</h2>
                <span className="text-xs text-[#888888]">
                  Last 7 days
                </span>
              </div>
              
              {activity.topShowsThisWeek.length === 0 ? (
                <div className="py-8 text-center text-[#888888]">
                  No shows watched this week
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.topShowsThisWeek.map((show, idx) => (
                    <div key={idx} className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-[#a1a1a1] w-6">#{idx + 1}</span>
                          <span className="text-white font-medium">{show.show}</span>
                        </div>
                        <span className="bg-[#22c55e]/10 text-[#22c55e] px-2 py-1 rounded text-sm font-medium">
                          {show.count} {show.count === 1 ? 'view' : 'views'}
                        </span>
                      </div>
                      <p className="text-xs text-[#888888] mt-1">
                        Last watched: {formatTimeAgo(show.lastWatched)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Activity Card */}
            <div className="bg-[#151518] border border-[#27272a] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">User Activity</h2>
                <span className="text-xs text-[#888888]">
                  {activity.userSummary.length} user{activity.userSummary.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {activity.userSummary.length === 0 ? (
                <div className="py-8 text-center text-[#888888]">
                  No user data available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#27272a]">
                        <th className="text-left text-xs font-medium text-[#888888] uppercase tracking-wide py-2">User</th>
                        <th className="text-left text-xs font-medium text-[#888888] uppercase tracking-wide py-2">Total Views</th>
                        <th className="text-left text-xs font-medium text-[#888888] uppercase tracking-wide py-2">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272a]">
                      {activity.userSummary.map((user, idx) => (
                        <tr key={idx} className="hover:bg-[#27272a]/30 transition-colors">
                          <td className="py-3 text-sm text-white">{user.username}</td>
                          <td className="py-3 text-sm text-white">{user.totalViews}</td>
                          <td className="py-3 text-sm text-[#a1a1a1]">
                            {user.lastActivity ? formatTimeAgo(user.lastActivity) : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Library Stats */}
            <div className="lg:col-span-2 bg-[#151518] border border-[#27272a] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Library Statistics</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#3b82f6]/20 text-[#3b82f6] rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-[#888888] uppercase tracking-wide">Total Shows</p>
                      <p className="text-2xl font-bold text-white">{activity.libraryStats.totalShows}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-[#f87171]/20 text-[#f87171] rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-[#888888] uppercase tracking-wide">Total Movies</p>
                      <p className="text-2xl font-bold text-white">{activity.libraryStats.totalMovies}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
