'use client';

import React, { useState, useEffect } from 'react';

// Quick stats from live kanban data
export default function DashboardStats() {
  const [stats, setStats] = useState({
    activeAgents: 0,
    activeSubagents: 0,
    totalTasks: 0,
    inProgressTasks: 0,
    urgentItems: 0,
    tasksToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tasksRes, statusRes, subagentsRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/status'),
          fetch('/api/subagents')
        ]);
        
        const tasksData = await tasksRes.json();
        const statusData = await statusRes.json();
        const subagentsData = await subagentsRes.json();
        
        const tasks = tasksData.tasks || [];
        const agents = statusData.agents || {};
        const subagents = subagentsData.active || [];
        
        // Count active agents (working status)
        const activeAgents = Object.values(agents).filter(
          (a: any) => a.status === 'working'
        ).length;
        
        // Count active subagents
        const activeSubagents = subagents.length;
        
        // Count tasks in different states
        const inProgressTasks = tasks.filter((t: any) => t.column === 'in-progress').length;
        const urgentItems = tasks.filter((t: any) => t.priority === 'high' && t.column !== 'done').length;
        
        // Count tasks created today (only in-progress tasks)
        const today = new Date().toDateString();
        const activeTasksToday = tasks.filter((t: any) => {
          const createdDate = new Date(t.createdAt).toDateString();
          return createdDate === today && t.column === 'in-progress';
        }).length;
        
        setStats({
          activeAgents,
          activeSubagents,
          totalTasks: tasks.length,
          inProgressTasks,
          urgentItems,
          tasksToday: activeTasksToday
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-[#151518] border border-[#27272a] rounded-md p-4 animate-pulse">
            <div className="h-8 bg-[#27272a] rounded w-12 mb-2"></div>
            <div className="h-3 bg-[#27272a] rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4 stats-grid">
      <div className="bg-[#151518] border border-[#27272a] rounded-md p-3 sm:p-4">
        <div className="text-2xl sm:text-3xl font-semibold text-white">{stats.activeAgents}</div>
        <div className="text-xs text-[#888888] mt-1">Active Agents</div>
      </div>
      <div className="bg-[#151518] border border-[#27272a] rounded-md p-3 sm:p-4">
        <div className="text-2xl sm:text-3xl font-semibold text-white">{stats.activeSubagents}</div>
        <div className="text-xs text-[#888888] mt-1">Active Subagents</div>
      </div>
      <div className="bg-[#151518] border border-[#27272a] rounded-md p-3 sm:p-4">
        <div className="text-2xl sm:text-3xl font-semibold text-white">{stats.tasksToday}</div>
        <div className="text-xs text-[#888888] mt-1">Tasks Today</div>
      </div>
      <div className="bg-[#151518] border border-[#27272a] rounded-md p-3 sm:p-4">
        <div className="text-2xl sm:text-3xl font-semibold text-white">{stats.inProgressTasks}</div>
        <div className="text-xs text-[#888888] mt-1">In Progress</div>
      </div>
      <div className="bg-[#151518] border border-[#27272a] rounded-md p-3 sm:p-4">
        <div className="text-2xl sm:text-3xl font-semibold text-white">{stats.urgentItems}</div>
        <div className="text-xs text-[#888888] mt-1">Urgent Items</div>
      </div>
    </div>
  );
}
