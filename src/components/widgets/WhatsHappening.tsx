'use client';

import React, { useState, useEffect } from 'react';

interface SubAgent {
  id: string;
  task: string;
  model: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  label?: string;
}

interface AgentInfo {
  name: string;
  status: 'working' | 'idle' | 'offline';
  currentTask: string | null;
  lastActivity: string;
}

interface ActivityItem {
  id: number;
  agent_name: string;
  action: string;
  details: string;
  created_at: string;
}

interface DashboardData {
  agents: AgentInfo[];
  activeSubagents: SubAgent[];
  recentActivity: ActivityItem[];
  currentTask: {
    title: string;
    startedAt: string;
  } | null;
  metrics?: {
    eventsToday: number;
    deploysThisWeek: number;
    uptimeSeconds: number;
  };
}

export default function WhatsHappening() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deploys' | 'activity'>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await window.fetch('/api/activity/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch {
        // fallback: just show agents
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 15000); // 15s refresh for live feel
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
        <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">
          What's Happening
        </h2>
        <div className="text-[#71717a] text-sm">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
        <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">
          What's Happening
        </h2>
        <div className="text-[#71717a] text-sm">Unable to load</div>
      </div>
    );
  }

  const activeAgents = data.agents?.filter(a => a.status === 'working') || [];
  const idleAgents = data.agents?.filter(a => a.status === 'idle') || [];
  const runningSubagents = data.activeSubagents?.filter(s => s.status === 'running') || [];
  
  // Filter activity: group consecutive deploys, show meaningful events
  const recentItems = (() => {
    const all = data.recentActivity || [];
    const filtered: ActivityItem[] = [];
    let deployCount = 0;
    let lastDeployItem: ActivityItem | null = null;
    
    for (const item of all) {
      if (item.action === 'deploy_success' || item.action === 'deploy_smoke_test_failed') {
        deployCount++;
        lastDeployItem = item;
      } else {
        // Flush accumulated deploys before non-deploy item
        if (deployCount > 0 && lastDeployItem) {
          filtered.push({ ...lastDeployItem, details: deployCount === 1 ? lastDeployItem.details : `${deployCount} deploys, latest: ${lastDeployItem.details || 'success'}` });
          deployCount = 0;
          lastDeployItem = null;
        }
        filtered.push(item);
      }
    }
    // Flush trailing deploys
    if (deployCount > 0 && lastDeployItem) {
      filtered.push({ ...lastDeployItem, details: deployCount === 1 ? lastDeployItem.details : `${deployCount} deploys, latest: ${lastDeployItem.details || 'success'}` });
    }
    
    return filtered.slice(0, 8);
  })();

  // Second filter: by type
  const filteredRecentItems = (() => {
    if (filter === 'deploys') return recentItems.filter(i => i.action === 'deploy_success' || i.action === 'deploy_smoke_test_failed');
    if (filter === 'activity') return recentItems.filter(i => i.action !== 'deploy_success' && i.action !== 'deploy_smoke_test_failed');
    return recentItems;
  })();

  return (
    <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide">
          What's Happening
        </h2>
        <div className="flex bg-[#0d0d0f] border border-[#27272a] rounded overflow-hidden">
          {([
            { key: 'all', label: 'All' },
            { key: 'activity', label: 'Activity' },
            { key: 'deploys', label: 'Deploys' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[10px] px-2 py-1 transition-colors ${
                filter === f.key ? 'bg-[#5e6ad2] text-white' : 'text-[#71717a] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Work */}
      {activeAgents.length > 0 || runningSubagents.length > 0 ? (
        <div className="space-y-3 mb-4">
          {/* Primary agents working */}
          {activeAgents.map(agent => (
            <div key={agent.name} className="flex items-start gap-3">
              <div className="mt-1 w-2 h-2 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white font-medium capitalize">{agent.name}</div>
                <div className="text-xs text-[#a1a1a1] truncate">{agent.currentTask || 'Working...'}</div>
              </div>
            </div>
          ))}

          {/* Running sub-agents */}
          {runningSubagents.map(sa => (
            <div key={sa.id} className="flex items-start gap-3 ml-4">
              <div className="mt-1 w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-blue-300 font-medium">
                  {sa.label || `Sub-agent`}
                  <span className="text-[#71717a] ml-2 text-xs">{sa.model?.split(':')[0]}</span>
                </div>
                <div className="text-xs text-[#a1a1a1] truncate">{sa.task}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4 text-[#71717a] text-sm">
          <div className="w-2 h-2 rounded-full bg-[#525252] flex-shrink-0" />
          All quiet — no active work
        </div>
      )}

      {/* Idle agents */}
      {idleAgents.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-xs text-[#71717a]">
          {idleAgents.map(a => (
            <span key={a.name} className="capitalize">{a.name}</span>
          )).reduce((acc, curr, i) => i === 0 ? [curr] : [...acc, ' · ', curr], [] as React.ReactNode[])}
          <span>standing by</span>
        </div>
      )}

      {/* Recent Activity */}
      {filteredRecentItems.length > 0 && (
        <div className="border-t border-[#27272a] pt-3 mt-2">
          <div className="text-xs text-[#71717a] mb-2">Recent</div>
          <div className="space-y-1.5">
            {filteredRecentItems.map(item => (
              <div key={item.id} className="flex items-start gap-2 text-xs">
                <span className="text-[#71717a] whitespace-nowrap">
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[#a1a1a1] capitalize">{item.agent_name}</span>
                <span className="text-[#e8e8e8] truncate">
                  {formatAction(item.action, item.details)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Metrics bar */}
      {data.metrics && (
        <div className="border-t border-[#27272a] pt-3 mt-3 flex items-center gap-4 text-[10px] text-[#525252]">
          <span>📊 {data.metrics.eventsToday} events today</span>
          <span>🚀 {data.metrics.deploysThisWeek} deploys this week</span>
          <span>⏱️ {formatUptime(data.metrics.uptimeSeconds)}</span>
        </div>
      )}
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h uptime`;
  return `${hours}h uptime`;
}

function formatAction(action: string, details: string): string {
  switch (action) {
    case 'task_started': return `→ ${details}`;
    case 'task_completed': return `✓ ${details}`;
    case 'heartbeat': return details.split(': ').pop() || 'heartbeat';
    case 'deploy_success': return details.match(/^\d+ deploys/) ? `✓ ${details}` : '✓ Deployed';
    case 'deploy_smoke_test_failed': return `✗ Deploy failed: ${details}`;
    case 'mc_api_unhealthy': return `⚠ API unhealthy: ${details}`;
    default: return details || action;
  }
}