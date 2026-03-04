'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AgentStatus from '@/components/widgets/AgentStatus';
import TaskManager from '@/components/widgets/TaskManager';
import CalendarWidget from '@/components/widgets/CalendarWidget';
import CustomToolPlaceholder from '@/components/widgets/CustomToolPlaceholder';
import DashboardStats from '@/components/widgets/DashboardStats';
import LiveActivitySidebar from '@/components/widgets/LiveActivitySidebar';

interface AgentStatusData {
  status: 'working' | 'idle';
  currentTask?: string;
  lastActivity: string;
}

export default function Home() {
  const [username, setUsername] = useState('');
  const [agents, setAgents] = useState<{ [key: string]: AgentStatusData }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUsername(data.username || ''));
  }, []);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setAgents(data.agents || {});
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
        setLoading(false);
      }
    };
    
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Main Content */}
        <div className="pr-[340px]">
          {/* Quick Stats Row - Live Data */}
          <DashboardStats />

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <AgentStatus />
            <CalendarWidget />
          </div>

          <div className="mb-4">
            <TaskManager />
          </div>

          {/* Custom Tools Section */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Custom Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <CustomToolPlaceholder
                title="GitHub Monitor"
                icon="🐙"
                description="Track issues, PRs, and CI/CD status"
              />
              <CustomToolPlaceholder
                title="Email Quick View"
                icon="📧"
                description="Scan and prioritize incoming emails"
              />
              <CustomToolPlaceholder
                title="System Monitor"
                icon="🖥️"
                description="View CPU, memory, and disk usage"
              />
            </div>
          </div>
        </div>

        {/* Live Activity Sidebar - Fixed on Right */}
        <div className="fixed top-[60px] right-0 h-[calc(100vh-60px)] w-[340px] z-40 hidden lg:block">
          <LiveActivitySidebar agents={agents} />
        </div>
      </div>

      {/* User Menu */}
      {username && (
        <div className="fixed bottom-4 right-4 flex items-center gap-3">
          <span className="text-xs text-[#888888]">Logged in as <strong className="text-[#e8e8e8]">{username}</strong></span>
          <button
            onClick={handleLogout}
            className="text-xs bg-[#151518] border border-[#27272a] hover:bg-[#1a1a1f] text-[#888888] hover:text-white px-3 py-1.5 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
