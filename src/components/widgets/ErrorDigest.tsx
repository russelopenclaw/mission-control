'use client';

import React, { useState, useEffect } from 'react';

interface ErrorEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  severity: 'error' | 'warning' | 'critical';
}

export default function ErrorDigest() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchErrors() {
    try {
      // Try the events endpoint for error events
      const res = await fetch('/api/events?channel=errors&limit=20');
      if (res.ok) {
        const data = await res.json();
        const errorEvents = (data.events || []).map((e: any) => ({
          id: `evt-${e.id}`,
          timestamp: e.timestamp || e.created_at,
          source: e.data?.source || 'system',
          message: e.data?.message || e.data?.title || 'Unknown error',
          severity: e.data?.severity || 'error',
        }));
        setErrors(errorEvents);
      }
    } catch {
      // Fallback: no data
    }
    setLoading(false);
  }

  const criticalCount = errors.filter(e => e.severity === 'critical').length;
  const errorCount = errors.filter(e => e.severity === 'error').length;

  return (
    <div className="bg-[#151518] rounded-lg border border-[#27272a] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#e8e8e8] flex items-center gap-2">
          🔥 Error Digest
          {(criticalCount + errorCount) > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
              {criticalCount + errorCount}
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
      ) : errors.length === 0 ? (
        <div className="text-center py-6">
          <span className="text-2xl">✨</span>
          <p className="text-sm text-[#22c55e] mt-2">No errors in the last 24 hours</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(expanded ? errors : errors.slice(0, 3)).map((error) => (
            <div
              key={error.id}
              className={`flex items-start gap-2 px-3 py-2 rounded-md ${
                error.severity === 'critical' 
                  ? 'bg-red-500/10 border border-red-500/20'
                  : error.severity === 'error'
                  ? 'bg-orange-500/5 border border-orange-500/10'
                  : 'bg-yellow-500/5 border border-yellow-500/10'
              }`}
            >
              <span className="text-sm flex-shrink-0">
                {error.severity === 'critical' ? '🔴' : error.severity === 'error' ? '🟠' : '🟡'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#e8e8e8] truncate">{error.message}</p>
                <p className="text-xs text-[#52525b]">
                  {error.source} · {relativeTime(error.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function relativeTime(dateStr: string): string {
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