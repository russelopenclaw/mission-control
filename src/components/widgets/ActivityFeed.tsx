'use client';

import React, { useState, useEffect } from 'react';

interface ActivityItem {
  id: number;
  agent_name: string;
  action: string;
  details: string;
  created_at: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'agent' | 'system'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activity/status');
        if (!res.ok) return;
        const data = await res.json();
        setActivities(data.recentActivity || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' 
    ? activities 
    : activities.filter(a => filter === 'agent' ? a.agent_name !== 'system' : a.agent_name === 'system');

  const formatAction = (action: string, details: string): string => {
    switch (action) {
      case 'task_started': return `→ ${details}`;
      case 'task_completed': return `✓ ${details}`;
      case 'heartbeat': return details.split(': ').pop() || 'heartbeat';
      case 'deploy_success': return '✓ Deployed successfully';
      case 'deploy_smoke_test_failed': return `✗ Deploy failed: ${details}`;
      case 'mc_api_unhealthy': return `⚠ API unhealthy: ${details}`;
      case 'api_health_check': return '♥ Health check passed';
      default: return details || action;
    }
  };

  const getActionColor = (action: string): string => {
    if (action.startsWith('task_completed') || action === 'deploy_success') return 'text-green-400';
    if (action.startsWith('task_started')) return 'text-blue-400';
    if (action.includes('failed') || action.includes('unhealthy')) return 'text-red-400';
    if (action === 'heartbeat' || action === 'api_health_check') return 'text-[#71717a]';
    return 'text-[#e8e8e8]';
  };

  if (loading) {
    return (
      <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
        <h3 className="text-sm font-semibold text-[#a1a1a1] mb-3">Activity Feed</h3>
        <div className="text-[#71717a] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#151518] rounded-lg border border-[#27272a]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
        <h3 className="text-sm font-semibold text-[#a1a1a1]">Activity Feed</h3>
        <div className="flex gap-1">
          {(['all', 'agent', 'system'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                filter === f 
                  ? 'bg-blue-600/30 text-blue-400' 
                  : 'text-[#71717a] hover:text-[#e8e8e8]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'agent' ? 'Agent' : 'System'}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-[#71717a] text-sm">No activity</div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <span className="text-[#71717a] whitespace-nowrap font-mono">
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[#71717a] capitalize min-w-[3rem]">{item.agent_name}</span>
              <span className={getActionColor(item.action)}>
                {formatAction(item.action, item.details)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}