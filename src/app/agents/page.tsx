'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

interface AgentStatus {
  name: string;
  status: 'working' | 'idle' | 'offline';
  current_task?: string;
  last_activity: string;
}

interface Task {
  id: number;
  title: string;
  column_name: string;
  assignee: string;
  priority: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000); // Poll every 10s for live updates
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data.agents || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-500 text-white';
      case 'idle': return 'bg-yellow-500 text-black';
      case 'offline': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return '🔄';
      case 'idle': return '⏸';
      case 'offline': return '❌';
      default: return '❓';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-gray-400 hover:text-white">← Dashboard</Link>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Agents</h1>
          <p className="text-gray-400">Live activity monitoring for all agents</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-[#151518] border border-[#27272a] rounded-lg p-8 text-center">
            <p className="text-gray-400">Loading agents...</p>
          </div>
        )}

        {/* Agents Grid */}
        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-2">
            {agents.map((agent) => (
              <div 
                key={agent.name}
                className="bg-[#151518] border border-[#27272a] rounded-lg p-6"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusColor(agent.status).split(' ')[0]}`}></div>
                  <h2 className="text-xl font-semibold text-white capitalize">{agent.name}</h2>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(agent.status)}`}>
                    {getStatusIcon(agent.status)} {agent.status}
                  </span>
                </div>

                {/* Current Task */}
                {agent.current_task && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Current Task</h3>
                    <div className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3">
                      <p className="text-gray-300 text-sm">{agent.current_task}</p>
                    </div>
                  </div>
                )}

                {/* Last Activity */}
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last Activity</h3>
                  <p className="text-gray-400 text-sm">
                    {new Date(agent.last_activity).toLocaleString()} <span className="text-gray-500">({formatTimeAgo(agent.last_activity)})</span>
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="pt-4 border-t border-[#27272a]">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Session: <span className="text-gray-400">Active</span></span>
                    <span>Mode: <span className="text-gray-400">Autonomous</span></span>
                  </div>
                </div>
              </div>
            ))}

            {agents.length === 0 && (
              <div className="col-span-full bg-[#151518] border border-[#27272a] rounded-lg p-8 text-center">
                <p className="text-gray-400">No agents found</p>
              </div>
            )}
          </div>
        )}

        {/* Live Activity Note */}
        <div className="mt-8 bg-[#151518] border border-[#27272a] rounded-lg p-4">
          <p className="text-xs text-gray-500">
            📊 Auto-refreshes every 10 seconds for live activity updates
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
