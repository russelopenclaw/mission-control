'use client';

import React, { useState, useEffect } from 'react';

interface AgentStatus {
  status: 'working' | 'idle';
  currentTask?: string;
  lastActivity: string;
}

interface AgentsResponse {
  agents: Record<string, AgentStatus>;
}

function timeAgo(iso: string): string {
  if (!iso) return 'unknown';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function AgentStatusPill() {
  const [agents, setAgents] = useState<AgentsResponse>({ agents: {} });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setAgents(data);
          setLoaded(true);
        }
      } catch {
        // Silent — pill just shows "offline" if API is down
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // 1 min, not 10s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const names = Object.keys(agents.agents || {});
  if (names.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#525252]" />
        <span className="text-xs text-[#71717a]">
          {loaded ? 'No agent online' : 'Agent: unknown'}
        </span>
      </div>
    );
  }

  // Show the first agent (usually just "alfred")
  const firstEntry = names[0];
  if (!firstEntry) {
    // unreachable, but satisfies TS
    return null;
  }
  const name = firstEntry;
  const info = agents.agents[name];
  const isWorking = info.status === 'working';
  const color = isWorking ? 'bg-[#22c55e]' : 'bg-[#eab308]';
  const taskLabel = isWorking
    ? info.currentTask || 'working'
    : `idle ${timeAgo(info.lastActivity)}`;

  return (
    <div
      className="flex items-center gap-2 min-w-0"
      title={`${name}: ${info.status} — ${taskLabel}`}
    >
      <div className={`w-2 h-2 rounded-full ${color} ${isWorking ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-[#a1a1aa] truncate">
        <span className="text-[#e8e8e8] font-medium">{name}</span>
        <span className="text-[#525252] mx-1">·</span>
        <span className="text-[#71717a]">{taskLabel}</span>
      </span>
    </div>
  );
}
