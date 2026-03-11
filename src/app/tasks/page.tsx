'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import LiveActivitySidebar from '@/components/widgets/LiveActivitySidebar';

interface Task {
  id: string;
  title: string;
  column: 'backlog' | 'in-progress' | 'review' | 'done';
  assignee: 'kevin' | 'alfred' | 'jeeves' | string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  description?: string;
}

interface AgentStatus {
  status: 'working' | 'idle';
  currentTask?: string;
  lastActivity: string;
}

interface KanbanData {
  tasks: Task[];
  agents: {
    [key: string]: AgentStatus;
  };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<{ [key: string]: AgentStatus }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Fetch tasks and agent status
  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, statusRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/status')
      ]);
      
      const tasksData = await tasksRes.json();
      const statusData = await statusRes.json();
      
      setTasks(tasksData.tasks || []);
      setAgents(statusData.agents || {});
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleMoveTask = async (taskId: string, newColumn: 'backlog' | 'in-progress' | 'review' | 'done') => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, column: newColumn })
      });
      
      if (response.ok) {
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, column: newColumn } : t
        ));
      }
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  };

  const handleAddTask = async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(prev => [...prev, data.task]);
        setIsAddingTask(false);
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Main Kanban Board */}
        <div className="lg:pr-[340px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h1 className="text-xl font-semibold text-white">Tasks</h1>
            <button
              onClick={() => setIsAddingTask(true)}
              className="bg-[#5e6ad2] hover:bg-[#4f5bb5] text-white text-sm font-medium min-h-[44px] px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            >
              + Add Task
            </button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <span className="text-[#888888]">Loading tasks...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <KanbanBoard
                tasks={tasks}
                onMoveTask={handleMoveTask}
                onTaskClick={handleTaskClick}
              />
            </div>
          )}
        </div>

        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Live Activity Sidebar - Slide-in on Mobile, Fixed on Desktop */}
        <div className={`fixed top-[60px] right-0 h-[calc(100vh-60px)] w-[340px] z-50 transition-transform duration-300 ${
          showMobileSidebar ? 'translate-x-0' : 'translate-x-full'
        } lg:translate-x-0 lg:block`}>
          <LiveActivitySidebar agents={agents} />
        </div>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="fixed bottom-4 right-4 lg:hidden z-50 bg-[#1a1a1f] border border-[#27272a] hover:bg-[#27272a] text-[#e8e8e8] p-3 rounded-full shadow-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle activity panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>

      {/* Task Details Modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#151518] border border-[#27272a] rounded-lg max-w-md w-full p-4 sm:p-6 my-8">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{selectedTask.title}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888888] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wide">Status</label>
                <p className="text-sm text-[#e8e8e8] capitalize">{selectedTask.column.replace('-', ' ')}</p>
              </div>
              
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wide">Assignee</label>
                <p className="text-sm text-[#e8e8e8] capitalize">{selectedTask.assignee}</p>
              </div>
              
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wide">Priority</label>
                <p className={`text-sm capitalize ${
                  selectedTask.priority === 'high' ? 'text-[#f87171]' :
                  selectedTask.priority === 'medium' ? 'text-[#fbbf24]' :
                  'text-[#86efac]'
                }`}>
                  {selectedTask.priority}
                </p>
              </div>
              
              {selectedTask.description && (
                <div>
                  <label className="text-xs text-[#888888] uppercase tracking-wide">Description</label>
                  <p className="text-sm text-[#a1a1a1] mt-1">{selectedTask.description}</p>
                </div>
              )}
              
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wide">Created</label>
                <p className="text-sm text-[#a1a1a1]">
                  {new Date(selectedTask.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddingTask && (
        <AddTaskModal
          onClose={() => setIsAddingTask(false)}
          onAdd={handleAddTask}
        />
      )}
    </DashboardLayout>
  );
}

// Add Task Modal Component
function AddTaskModal({ onClose, onAdd }: { 
  onClose: () => void; 
  onAdd: (task: Omit<Task, 'id' | 'createdAt'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('alfred');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [column, setColumn] = useState<'backlog' | 'in-progress' | 'review' | 'done'>('backlog');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      assignee,
      priority,
      column
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#151518] border border-[#27272a] rounded-lg max-w-md w-full p-4 sm:p-6 my-8">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Task</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2] min-h-[44px]"
              placeholder="Task title"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2] resize-none"
              rows={3}
              placeholder="Optional details"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
                Assignee
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2] min-h-[44px]"
              >
                <option value="kevin">Kevin</option>
                <option value="alfred">Alfred</option>
                <option value="jeeves">Jeeves</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2] min-h-[44px]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-[#888888] uppercase tracking-wide mb-1">
              Column
            </label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value as 'backlog' | 'in-progress' | 'review' | 'done')}
              className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5e6ad2] min-h-[44px]"
            >
              <option value="backlog">Backlog</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium min-h-[44px] px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#5e6ad2] hover:bg-[#4f5bb5] text-white text-sm font-medium min-h-[44px] px-4 py-2 rounded-md transition-colors w-full sm:w-auto"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
