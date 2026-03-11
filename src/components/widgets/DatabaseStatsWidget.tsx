'use client';

import React, { useState, useEffect } from 'react';

interface DBStats {
  tasks: number;
  agents: number;
  subagents: number;
  taskHistory: number;
  tasksCompletedToday: number;
  databaseHealth: 'healthy' | 'warning' | 'error';
  lastMigration: string;
}

export default function DatabaseStatsWidget() {
  const [stats, setStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/db-stats');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch DB stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <div className="text-xs text-[#888888]">Loading database stats...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <div className="text-xs text-[#ef4444]">Database stats unavailable</div>
      </div>
    );
  }

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide">
          🗄️ Database Status
        </h2>
        <span className="text-xs text-[#22c55e] flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
          Healthy
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0d0d0f] rounded-md p-3">
          <div className="text-2xl font-semibold text-white">{stats.tasks}</div>
          <div className="text-xs text-[#888888]">Total Tasks</div>
        </div>
        <div className="bg-[#0d0d0f] rounded-md p-3">
          <div className="text-2xl font-semibold text-white">{stats.agents}</div>
          <div className="text-xs text-[#888888]">Active Agents</div>
        </div>
        <div className="bg-[#0d0d0f] rounded-md p-3">
          <div className="text-2xl font-semibold text-white">{stats.subagents}</div>
          <div className="text-xs text-[#888888]">Subagents</div>
        </div>
        <div className="bg-[#0d0d0f] rounded-md p-3">
          <div className="text-2xl font-semibold text-white">{stats.tasksCompletedToday}</div>
          <div className="text-xs text-[#888888]">Done Today</div>
        </div>
      </div>
      
      <div className="mt-3 text-[10px] text-[#525252] text-center">
        PostgreSQL migration completed {new Date(stats.lastMigration).toLocaleDateString()}
      </div>
    </div>
  );
}
