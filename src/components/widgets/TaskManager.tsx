'use client';

import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  column: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  description?: string;
}

// Map kanban columns to status
const columnToStatus = (column: string): 'pending' | 'in-progress' | 'completed' => {
  switch (column) {
    case 'done':
      return 'completed';
    case 'in-progress':
      return 'in-progress';
    default:
      return 'pending';
  }
};

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        // Show all tasks, but prioritize in-progress
        const allTasks = data.tasks || [];
        // Sort: in-progress first, then backlog, then done
        const sorted = allTasks.sort((a: any, b: any) => {
          if (a.column === 'in-progress') return -1;
          if (b.column === 'in-progress') return 1;
          if (a.column === 'backlog') return -1;
          if (b.column === 'backlog') return 1;
          return 0;
        });
        setTasks(sorted);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
    // Refresh every 30 seconds like the Tasks page
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter tasks based on toggle state
  const filteredTasks = showAll 
    ? tasks 
    : tasks.filter(t => t.column === 'in-progress');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-[#f87171]';
      case 'medium': return 'text-[#fbbf24]';
      case 'low': return 'text-[#86efac]';
      default: return 'text-[#888888]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#064e3b] text-[#86efac] border-[#065f46]';
      case 'in-progress': return 'bg-[#1e3a8a] text-[#93c5fd] border-[#1e40af]';
      case 'pending': return 'bg-[#27272a] text-[#a1a1a1] border-[#3f3f46]';
      default: return 'bg-[#27272a] border-[#3f3f46]';
    }
  };

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide">Task Management</h2>
        <button
          onClick={() => setShowAll(!showAll)}
          className={`text-xs px-4 py-2 rounded border transition-colors min-h-[44px] flex items-center justify-center ${
            showAll 
              ? 'bg-[#27272a] text-white border-[#3f3f46]' 
              : 'bg-[#0d0d0f] text-[#888888] border-[#27272a] hover:border-[#3f3f46]'
          }`}
        >
          {showAll ? 'Show Active Only' : 'Show All Tasks'}
        </button>
      </div>
      <div className="mb-2 text-xs text-[#888888]">
        {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} {showAll ? '' : 'active'}
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-[#525252] text-sm">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[#525252] text-sm">
            {showAll ? 'No tasks found' : 'No active tasks'}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 sm:p-4 hover:border-[#3f3f46] transition-colors cursor-pointer active:bg-[#1a1a1f]"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <h3 className="font-medium text-[#e8e8e8] text-sm flex-1">{task.title}</h3>
                <span className={`text-[10px] px-2 py-1 rounded border ${getStatusColor(columnToStatus(task.column))}`}>
                  {task.column.replace('-', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#888888]">
                <span className={getPriorityColor(task.priority)}>
                  ⚡ {task.priority}
                </span>
                {task.assignee && (
                  <span>👤 {task.assignee.charAt(0).toUpperCase() + task.assignee.slice(1)}</span>
                )}
                <span>📅 {new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
