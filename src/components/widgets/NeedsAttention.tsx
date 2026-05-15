'use client';

import React, { useState, useEffect } from 'react';

interface AttentionItem {
  id: string;
  type: 'overdue' | 'stuck' | 'failed' | 'warning' | 'info';
  icon: string;
  title: string;
  description: string;
  since?: string;
  action?: string;
}

const typeStyles: Record<string, { bg: string; border: string; text: string }> = {
  overdue: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  stuck: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  failed: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
};

export default function NeedsAttention() {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttentionItems();
    const interval = setInterval(fetchAttentionItems, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAttentionItems() {
    try {
      const results: AttentionItem[] = [];

      // Fetch from multiple sources in parallel
      const [tasksRes, agentsRes, remindersRes, eventsRes] = await Promise.all([
        fetch('/api/tasks').catch(() => null),
        fetch('/api/status').catch(() => null),
        fetch('/api/calendar/reminders').catch(() => null),
        fetch('/api/events?limit=20').catch(() => null),
      ]);

      // Overdue reminders
      if (remindersRes?.ok) {
        const reminders = await remindersRes.json();
        const overdue = (reminders.reminders || reminders || []).filter(
          (r: any) => !r.completed && r.due_date && new Date(r.due_date) < new Date()
        );
        for (const r of overdue.slice(0, 3)) {
          const daysOverdue = Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000);
          results.push({
            id: `reminder-${r.id}`,
            type: 'overdue',
            icon: '🔔',
            title: r.title,
            description: `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
            since: r.due_date,
            action: 'Mark complete or reschedule',
          });
        }
      }

      // Stuck tasks (in-progress >6 hours)
      if (tasksRes?.ok) {
        const tasksData = await tasksRes.json();
        const tasks = tasksData.tasks || [];
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
        const stuck = tasks.filter(
          (t: any) => t.column_name === 'in-progress' && 
                      t.started_at && 
                      new Date(t.started_at).getTime() < sixHoursAgo
        );
        for (const t of stuck.slice(0, 3)) {
          const hours = Math.floor((Date.now() - new Date(t.started_at).getTime()) / 3600000);
          results.push({
            id: `task-${t.id}`,
            type: 'stuck',
            icon: '⏳',
            title: t.title,
            description: `In progress for ${hours}h`,
            since: t.started_at,
            action: 'Check status or kill subagent',
          });
        }
      }

      // Agent health
      if (agentsRes?.ok) {
        const statusData = await agentsRes.json();
        const agents = statusData.agents || {};
        for (const [name, info] of Object.entries(agents) as any[]) {
          const lastActivity = info.lastActivity ? new Date(info.lastActivity) : null;
          if (lastActivity) {
            const hoursSince = (Date.now() - lastActivity.getTime()) / 3600000;
            if (hoursSince > 24 && info.status === 'working') {
              results.push({
                id: `agent-${name}`,
                type: 'warning',
                icon: '🤖',
                title: `${name} claims "working" but inactive ${Math.floor(hoursSince)}h`,
                description: info.currentTask || 'No current task',
                since: info.lastActivity,
                action: 'Verify agent is actually running',
              });
            }
          }
        }
      }

      // Recent error/failure events
      if (eventsRes?.ok) {
        const eventsData = await eventsRes.json();
        const failures = (eventsData.events || []).filter(
          (e: any) => e.channel === 'errors' || e.channel === 'failures' || 
                     (e.data?.type === 'error' || e.data?.type === 'failure')
        );
        for (const e of failures.slice(0, 3)) {
          results.push({
            id: `event-${e.id}`,
            type: 'failed',
            icon: '❌',
            title: e.data?.title || e.data?.message || 'Error',
            description: e.data?.description || 'Unknown error',
            since: e.timestamp,
          });
        }
      }

      // Sort: overdue first, then stuck, then warnings
      const typeOrder = { overdue: 0, stuck: 1, failed: 2, warning: 3, info: 4 };
      results.sort((a, b) => (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5));

      setItems(results);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch attention items:', e);
      setLoading(false);
    }
  }

  const criticalCount = items.filter(i => i.type === 'overdue' || i.type === 'failed').length;

  return (
    <div className="bg-[#151518] rounded-lg border border-[#27272a] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#e8e8e8] flex items-center gap-2">
          🚨 Needs Attention
          {criticalCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full animate-pulse">
              {criticalCount}
            </span>
          )}
        </h3>
        <button
          onClick={fetchAttentionItems}
          className="text-xs text-[#71717a] hover:text-[#e8e8e8] transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="w-8 h-8 bg-[#27272a] rounded-md" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-[#27272a] rounded w-3/4" />
                <div className="h-2 bg-[#27272a] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-3xl">✅</span>
          <p className="text-sm text-[#22c55e] mt-2 font-medium">All clear — nothing needs attention</p>
          <p className="text-xs text-[#71717a] mt-1">Overdue reminders, stuck tasks, and failures appear here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
          {items.map((item) => {
            const styles = typeStyles[item.type] || typeStyles.info;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 px-3 py-3 rounded-lg border ${styles.bg} ${styles.border} transition-colors`}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${styles.text}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-[#a1a1a1] mt-0.5">
                    {item.description}
                  </p>
                  {item.action && (
                    <p className="text-xs text-[#71717a] mt-1 italic">
                      💡 {item.action}
                    </p>
                  )}
                </div>
                {item.since && (
                  <span className="text-xs text-[#52525b] flex-shrink-0 whitespace-nowrap">
                    {relativeTime(item.since)}
                  </span>
                )}
              </div>
            );
          })}
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
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}