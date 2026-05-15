'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import WhatsHappening from '@/components/widgets/WhatsHappening';
import CalendarWidget from '@/components/widgets/CalendarWidget';
import ActivityFeed from '@/components/widgets/ActivityFeed';
import ErrorDigest from '@/components/widgets/ErrorDigest';
import HealthStatus from '@/components/widgets/HealthStatus';
import PlexActivity from '@/components/widgets/PlexActivity';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';

interface AgentStatusData {
  status: 'working' | 'idle';
  currentTask?: string;
  lastActivity: string;
}

export default function Home() {
  useKeyboardShortcuts();
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
        {/* Primary: What's happening now */}
        <div className="mb-4">
          <WhatsHappening />
        </div>

        {/* Secondary: Calendar + Activity (side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <CalendarWidget />
          <ActivityFeed />
        </div>

        {/* Tertiary: Health + Errors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <HealthStatus />
          <PlexActivity />
        </div>

        {/* Quaternary: Errors */}
        <div className="mb-4">
          <ErrorDigest />
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