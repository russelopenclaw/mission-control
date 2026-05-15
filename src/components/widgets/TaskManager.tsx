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
  deliverables?: string;
  linked_subagent?: string;
  started_at?: string;
  completed_at?: string;
}

// Map kanban columns to status
const columnToStatus = (column: string): 'pending' | 'in-progress' | 'completed' | 'blocked' => {
  switch (column) {
    case 'done':
    case 'DONE':
      return 'completed';
    case 'in-progress':
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'blocked':
    case 'BLOCKED':
      return 'blocked';
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
        const allTasks = (data.tasks || [])
          .filter((t: any) => t.column_name !== 'archived')
          .map((t: any) => ({
            id: t.id || t.column_name,
            title: t.title,
            column: t.column_name,
            assignee: t.assignee,
            priority: t.priority || 'medium',
            createdAt: t.created_at,
            description: t.description,
            deliverables: t.deliverables,
            linked_subagent: t.linked_subagent,
            started_at: t.started_at,
            completed_at: t.completed_at,
          }));
        
        // Sort: in-progress first, then backlog, then done
        const sorted = allTasks.sort((a: Task, b: Task) => {
          const order: Record<string, number> = { 'in-progress': 0, backlog: 1, done: 3 };
          return (order[a.column] ?? 2) - (order[b.column] ?? 2);
        });
        setTasks(sorted);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredTasks = showAll 
    ? tasks 
    : tasks.filter(t => t.column === 'in-progress' || t.column === 'backlog');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-[#f87171]';
      case 'medium': return 'text-[#fbbf24]';
      case 'low': return 'text-[#86efac]';
      case 'critical': return 'text-[#ef4444]';
      default: return 'text-[#888888]';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#064e3b] text-[#86efac] border-[#065f46]';
      case 'in-progress': return 'bg-[#1e3a8a] text-[#93c5fd] border-[#1e40af]';
      case 'blocked': return 'bg-[#7f1d1d] text-[#fca5a5] border-[#991b1b]';
      default: return 'bg-[#27272a] text-[#a1a1a1] border-[#3f3f46]';
    }
  };

  function taskDuration(startedAt?: string, completedAt?: string): string | null {
    if (!startedAt) return null;
    const end = completedAt ? new Date(completedAt) : new Date();
    const hours = Math.floor((end.getTime() - new Date(startedAt).getTime()) / 3600000);
    const mins = Math.floor(((end.getTime() - new Date(startedAt).getTime()) % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide">
          Task Management
          <span className="ml-2 text-[#52525b]">
            ({tasks.filter(t => t.column === 'in-progress').length} active)
          </span>
        </h2>
        <button
          onClick={() => setShowAll(!showAll)}
          className={`text-xs px-4 py-2 rounded border transition-colors min-h-[44px] flex items-center justify-center ${
            showAll 
              ? 'bg-[#27272a] text-white border-[#3f3f46]' 
              : 'bg-[#0d0d0f] text-[#888888] border-[#27272a] hover:border-[#3f3f46]'
          }`}
        >
          {showAll ? 'Active Only' : 'Show All'}
        </button>
      </div>
      
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-[#525252] text-sm">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[#525252] text-sm">
            {showAll ? 'No tasks found' : 'No active tasks — all clear!'}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const status = columnToStatus(task.column);
            const duration = taskDuration(task.started_at, task.completed_at);
            
            return (
              <div 
                key={task.id} 
                className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 sm:p-4 hover:border-[#3f3f46] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                  <h3 className="font-medium text-[#e8e8e8] text-sm flex-1">{task.title}</h3>
                  <span className={`text-[10px] px-2 py-1 rounded border ${getStatusStyle(status)}`}>
                    {task.column.replace('-', ' ')}
                  </span>
                </div>
                
                {task.description && (
                  <p className="text-xs text-[#71717a] mb-2 line-clamp-2">{task.description}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#888888]">
                  <span className={getPriorityColor(task.priority)}>
                    ⚡ {task.priority}
                  </span>
                  {task.assignee && (
                    <span>👤 {task.assignee.charAt(0).toUpperCase() + task.assignee.slice(1)}</span>
                  )}
                  {duration && (
                    <span>⏱️ {duration}</span>
                  )}
                </div>
                
                {/* Deliverables — linked to actual work */}
                {task.deliverables && (
                  <div className="mt-2 pt-2 border-t border-[#27272a]">
                    <p className="text-xs text-[#a1a1a1]">
                      📦 {task.deliverables}
                    </p>
                  </div>
                )}
                
                {/* Linked subagent indicator */}
                {task.linked_subagent && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#7c3aed]/10 text-[#c4b5fd] border border-[#7c3aed]/20">
                      🤖 {task.linked_subagent}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}