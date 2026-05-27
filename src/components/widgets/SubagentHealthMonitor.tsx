'use client';

import React, { useState, useEffect } from 'react';

interface Subagent {
  runId: string;
  label?: string;
  task?: string;
  status: string;
  runtime?: string;
  totalTokens?: number;
  startedAt: string;
  completedAt?: string;
  lastUpdated?: string;
  note?: string;
}

export default function SubagentHealthMonitor() {
  const [activeSubagents, setActiveSubagents] = useState<Subagent[]>([]);
  const [recentSubagents, setRecentSubagents] = useState<Subagent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchSubagents();
    const interval = setInterval(fetchSubagents, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSubagents() {
    try {
      const res = await fetch('/api/subagents');
      if (res.ok) {
        const data = await res.json();
        setActiveSubagents(data.active || []);
        setRecentSubagents(data.recent || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }

  function formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '—';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  }

  function formatDuration(startStr: string, endStr?: string): string {
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    const diffMs = end - start;
    if (diffMs < 0) return '—';
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  function getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'running': return 'text-[#22c55e]';
      case 'completed': case 'done': case 'success': return 'text-[#4ade80]';
      case 'failed': case 'error': return 'text-red-400';
      case 'cancelled': return 'text-[#71717a]';
      default: return 'text-[#a1a1aa]';
    }
  }

  function getStatusDot(status: string): string {
    switch (status?.toLowerCase()) {
      case 'running': return '🟢';
      case 'completed': case 'done': case 'success': return '✅';
      case 'failed': case 'error': return '🔴';
      case 'cancelled': return '⚪';
      default: return '🟡';
    }
  }

  const activeCount = activeSubagents.length;
  const failedRecent = recentSubagents.filter(s => 
    s.status?.toLowerCase() === 'failed' || s.status?.toLowerCase() === 'error'
  ).length;

  return (
    <div className="bg-[#151518] rounded-lg border border-[#27272a] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#e8e8e8] flex items-center gap-2">
          🤖 Subagent Monitor
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-[#151518] bg-[#22c55e] rounded-full animate-pulse">
              {activeCount} active
            </span>
          )}
          {failedRecent > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
              {failedRecent} failed
            </span>
          )}
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#71717a] hover:text-[#e8e8e8] transition-colors"
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-[#27272a] rounded-md" />
          <div className="h-8 bg-[#27272a] rounded-md" />
        </div>
      ) : activeSubagents.length === 0 && recentSubagents.length === 0 ? (
        <div className="text-center py-6">
          <span className="text-2xl">🤖</span>
          <p className="text-sm text-[#71717a] mt-2">No subagent activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active subagents */}
          {activeSubagents.map((s) => (
            <div
              key={s.runId}
              className="flex items-start gap-2 px-3 py-2 rounded-md bg-[#22c55e]/5 border border-[#22c55e]/20"
            >
              <span className="text-sm flex-shrink-0 animate-pulse">🟢</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#e8e8e8] truncate">
                  {s.label || s.task || s.runId?.slice(0, 12) || 'Unknown'}
                </p>
                <p className="text-xs text-[#52525b]">
                  Running · {formatDuration(s.startedAt, s.completedAt || undefined)}
                  {s.totalTokens ? ` · ${s.totalTokens.toLocaleString()} tokens` : ''}
                </p>
              </div>
            </div>
          ))}

          {/* Recent subagents (limited when collapsed) */}
          {(expanded ? recentSubagents : recentSubagents.slice(0, 3)).map((s) => (
            <div
              key={s.runId}
              className={`flex items-start gap-2 px-3 py-2 rounded-md ${
                s.status?.toLowerCase() === 'failed' || s.status?.toLowerCase() === 'error'
                  ? 'bg-red-500/5 border border-red-500/10'
                  : 'bg-[#0d0d0f] border border-[#27272a]'
              }`}
            >
              <span className="text-sm flex-shrink-0">{getStatusDot(s.status)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#e8e8e8] truncate">
                  {s.label || s.task || s.runId?.slice(0, 12) || 'Unknown'}
                </p>
                <p className="text-xs text-[#52525b]">
                  <span className={getStatusColor(s.status)}>
                    {s.status || 'unknown'}
                  </span>
                  {' · '}
                  {formatRelativeTime(s.completedAt || s.lastUpdated || s.startedAt)}
                  {s.totalTokens ? ` · ${s.totalTokens.toLocaleString()} tokens` : ''}
                </p>
              </div>
            </div>
          ))}

          {!expanded && recentSubagents.length > 3 && (
            <p className="text-xs text-[#52525b] text-center">
              +{recentSubagents.length - 3} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}