'use client';

import React, { useState, useEffect } from 'react';

interface ActivityEntry {
  id: number;
  agent_name: string;
  action: string;
  details: string | null;
  task_id: number | null;
  created_at: string;
}

interface SubagentEntry {
  id: number;
  parent_agent: string;
  subagent_id: string;
  task: string;
  model: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

interface AgentStatus {
  name: string;
  status: string;
  current_task: string | null;
  last_activity: string;
}

export default function ActivityTimeline() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [subagents, setSubagents] = useState<SubagentEntry[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/activity/status');
        const data = await res.json();
        setActivities(data.recentActivity || []);
        setSubagents([...(data.activeSubagents || []), ...(data.recentCompleted || [])]);
        setAgents(data.agents || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp: string): string => {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getActionIcon = (action: string): string => {
    if (action.includes('heartbeat')) return '💓';
    if (action.includes('subagent_spawned')) return '🚀';
    if (action.includes('task_started')) return '▶️';
    if (action.includes('task_completed')) return '✅';
    if (action.includes('task_failed')) return '❌';
    if (action.includes('deploy')) return '🚢';
    if (action.includes('build')) return '🔨';
    if (action.includes('calendar')) return '📅';
    if (action.includes('email')) return '📧';
    return '📡';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'working': return 'text-[#22c55e]';
      case 'idle': return 'text-[#eab308]';
      case 'running': return 'text-[#3b82f6]';
      case 'completed': return 'text-[#22c55e]';
      case 'failed': return 'text-[#ef4444]';
      default: return 'text-[#71717a]';
    }
  };

  if (loading) {
    return (
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#27272a] rounded w-1/3" />
          <div className="h-3 bg-[#27272a] rounded w-2/3" />
          <div className="h-3 bg-[#27272a] rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Agent Status Bar */}
      {agents.length > 0 && (
        <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[#888888] uppercase tracking-wide mb-3">
            🤖 Agent Status
          </h3>
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.name} className="flex items-center gap-3 bg-[#0d0d0f] rounded-md p-3">
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'working' ? 'bg-[#22c55e] animate-pulse' :
                  agent.status === 'idle' ? 'bg-[#eab308]' : 'bg-[#71717a]'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#e8e8e8] capitalize">{agent.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${getStatusColor(agent.status)} bg-[#1a1a1f]`}>
                      {agent.status}
                    </span>
                  </div>
                  {agent.current_task && (
                    <p className="text-xs text-[#a1a1a1] truncate mt-0.5">{agent.current_task}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#52525b] whitespace-nowrap">
                  {formatTimeAgo(agent.last_activity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Sub-Agents */}
      {subagents.filter(s => s.status === 'running').length > 0 && (
        <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
          <h3 className="text-sm font-medium text-[#888888] uppercase tracking-wide mb-3">
            🚀 Active Sub-Agents
          </h3>
          <div className="space-y-2">
            {subagents.filter(s => s.status === 'running').map((sa) => (
              <div key={sa.id} className="flex items-start gap-3 bg-[#0d0d0f] rounded-md p-3">
                <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#e8e8e8] truncate">{sa.task}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#71717a]">{sa.model || 'unknown model'}</span>
                    <span className="text-[10px] text-[#52525b]">Started {formatTimeAgo(sa.started_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#888888] uppercase tracking-wide mb-3">
          📡 Activity Timeline
        </h3>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-xs text-[#525252] text-center py-4">No recent activity</p>
          ) : (
            activities.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[#1a1a1f] transition-colors">
                <span className="text-sm flex-shrink-0 mt-0.5">{getActionIcon(entry.action)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-[#a1a1a1] capitalize">{entry.agent_name}</span>
                    <span className="text-[10px] text-[#52525b]">{entry.action.replace(/_/g, ' ')}</span>
                  </div>
                  {entry.details && (
                    <p className="text-[10px] text-[#71717a] truncate">{entry.details}</p>
                  )}
                </div>
                <span className="text-[9px] text-[#52525b] whitespace-nowrap">{formatTimeAgo(entry.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}