'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AgentStatus from '@/components/widgets/AgentStatus';
import TaskManager from '@/components/widgets/TaskManager';
import CalendarWidget from '@/components/widgets/CalendarWidget';
import CustomToolPlaceholder from '@/components/widgets/CustomToolPlaceholder';
import DashboardStats from '@/components/widgets/DashboardStats';
import LiveActivitySidebar from '@/components/widgets/LiveActivitySidebar';
import DatabaseStatsWidget from '@/components/widgets/DatabaseStatsWidget';

interface AgentStatusData {
  status: 'working' | 'idle';
  currentTask?: string;
  lastActivity: string;
}

export default function Home() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
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
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}
        
        {/* Live Activity Sidebar - Fixed on Right (Desktop) / Slide-in (Mobile) */}
        <div className={`fixed top-[60px] right-0 h-[calc(100vh-60px)] w-[340px] z-50 transition-transform duration-300 ${
          showMobileSidebar ? 'translate-x-0' : 'translate-x-full'
        } lg:translate-x-0 lg:block ${showMobileSidebar ? '' : 'lg:fixed'}`}>
          <LiveActivitySidebar agents={agents} />
        </div>

        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="fixed bottom-4 right-4 lg:hidden z-50 bg-[#1a1a1f] border border-[#27272a] hover:bg-[#27272a] text-[#e8e8e8] p-3 rounded-full shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle activity panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${showMobileSidebar ? 'lg:pr-[340px]' : 'lg:pr-[340px]'} pr-0`}>
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

          <div className="mb-4">
            <DatabaseStatsWidget />
          </div>

          {/* Custom Tools Section */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Custom Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
      </div>

      {/* User Menu */}
      {username && (
        <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 flex items-center gap-3 z-30">
          <span className="text-xs text-[#888888] hidden sm:block">
            Logged in as <strong className="text-[#e8e8e8]">{username}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="text-xs bg-[#151518] border border-[#27272a] hover:bg-[#1a1a1f] text-[#888888] hover:text-white min-h-[44px] px-4 py-2 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
