'use client';

import React, { useState, useEffect } from 'react';

interface MemoryStats {
  dailyMemories: number;
  longTermMemoryExists: boolean;
  memoriesThisWeek: number;
  memoriesThisMonth: number;
  mem0Stats: {
    exists: boolean;
    memoryCount?: number;
    size?: number;
  };
}

interface MemoryStatsProps {
  onViewChange?: (view: 'daily' | 'longterm') => void;
}

export default function MemoryStats({ onViewChange }: MemoryStatsProps) {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/memory/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch memory stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !stats) {
    return (
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4 mb-4">
      <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Memory Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div 
          className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 cursor-pointer hover:border-[#5e6ad2] transition-colors"
          onClick={() => onViewChange?.('daily')}
        >
          <div className="text-2xl font-semibold text-white">{stats.dailyMemories}</div>
          <div className="text-xs text-[#888888] mt-1">Daily Memories</div>
        </div>
        <div 
          className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 cursor-pointer hover:border-[#5e6ad2] transition-colors"
          onClick={() => onViewChange?.('longterm')}
        >
          <div className="text-2xl font-semibold text-white">{stats.longTermMemoryExists ? '✓' : '✗'}</div>
          <div className="text-xs text-[#888888] mt-1">Long-term Memory</div>
        </div>
        <div className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3">
          <div className="text-2xl font-semibold text-white">{stats.memoriesThisWeek}</div>
          <div className="text-xs text-[#888888] mt-1">This Week</div>
        </div>
        <div className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3">
          <div className="text-2xl font-semibold text-white">{stats.memoriesThisMonth}</div>
          <div className="text-xs text-[#888888] mt-1">This Month</div>
        </div>
        {stats.mem0Stats.exists && (
          <div className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3">
            <div className="text-2xl font-semibold text-[#5e6ad2]">{stats.mem0Stats.memoryCount}</div>
            <div className="text-xs text-[#888888] mt-1">mem0 memories</div>
          </div>
        )}
      </div>
    </div>
  );
}
