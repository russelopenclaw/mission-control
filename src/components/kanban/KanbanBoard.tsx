'use client';

import React, { useState } from 'react';

interface Task {
  id: string;
  title: string;
  column: 'backlog' | 'in-progress' | 'review' | 'done';
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  description?: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newColumn: 'backlog' | 'in-progress' | 'review' | 'done') => void;
  onTaskClick: (task: Task) => void;
}

const COLUMNS: { id: 'backlog' | 'in-progress' | 'review' | 'done'; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: '#71717a' },
  { id: 'in-progress', title: 'In Progress', color: '#5e6ad2' },
  { id: 'review', title: 'Review', color: '#f59e0b' },
  { id: 'done', title: 'Done', color: '#22c55e' }
];

export default function KanbanBoard({ tasks, onMoveTask, onTaskClick }: KanbanBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map(column => (
        <Column
          key={column.id}
          column={column}
          tasks={tasks.filter(t => t.column === column.id)}
          onMoveTask={onMoveTask}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}

interface ColumnProps {
  column: { id: 'backlog' | 'in-progress' | 'review' | 'done'; title: string; color: string };
  tasks: Task[];
  onMoveTask: (taskId: string, newColumn: 'backlog' | 'in-progress' | 'review' | 'done') => void;
  onTaskClick: (task: Task) => void;
}

function Column({ column, tasks, onMoveTask, onTaskClick }: ColumnProps) {
  return (
    <div 
      className="flex-shrink-0 w-72 bg-[#151518] border border-[#27272a] rounded-lg flex flex-col"
      style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-[#27272a]">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[#e8e8e8] text-sm">{column.title}</h3>
          <span 
            className="text-xs text-[#888888] bg-[#0d0d0f] px-2 py-0.5 rounded"
            style={{ borderColor: column.color, borderWidth: '1px' }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#525252] text-sm">
            No tasks
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onMoveTask={onMoveTask}
              onTaskClick={onTaskClick}
              allColumns={COLUMNS.map(c => c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onMoveTask: (taskId: string, newColumn: 'backlog' | 'in-progress' | 'review' | 'done') => void;
  onTaskClick: (task: Task) => void;
  allColumns: string[];
}

function TaskCard({ task, onMoveTask, onTaskClick, allColumns }: TaskCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const currentColumnIndex = allColumns.findIndex(c => c === task.column);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-[#f87171]';
      case 'medium': return 'text-[#fbbf24]';
      case 'low': return 'text-[#86efac]';
      default: return 'text-[#888888]';
    }
  };

  const getAssigneeBadge = (assignee: string) => {
    switch (assignee.toLowerCase()) {
      case 'kevin': return 'bg-[#5e6ad2]';
      case 'alfred': return 'bg-[#22c55e]';
      case 'jeeves': return 'bg-[#f59e0b]';
      default: return 'bg-[#71717a]';
    }
  };

  const handleMove = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentColumnIndex - 1)
      : Math.min(allColumns.length - 1, currentColumnIndex + 1);
    
    const newColumn = allColumns[newIndex] as 'backlog' | 'in-progress' | 'review' | 'done';
    onMoveTask(task.id, newColumn);
    setShowMoveMenu(false);
  };

  return (
    <div 
      className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 hover:border-[#3f3f46] transition-colors cursor-pointer"
      onClick={() => onTaskClick(task)}
    >
      {/* Title */}
      <h4 className="font-medium text-[#e8e8e8] text-sm mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Metadata */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className={getPriorityColor(task.priority)}>
          ⚡ {task.priority}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${getAssigneeBadge(task.assignee)}`}>
          {task.assignee}
        </span>
      </div>

      {/* Created Date */}
      <p className="text-[10px] text-[#525252] mb-2">
        📅 {new Date(task.createdAt).toLocaleDateString()}
      </p>

      {/* Move Buttons */}
      <div className="flex items-center gap-1 pt-2 border-t border-[#27272a]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMove('prev');
          }}
          disabled={currentColumnIndex === 0}
          className="flex-1 text-[10px] text-[#888888] hover:text-white bg-[#1a1a1f] hover:bg-[#27272a] px-2 py-1 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Move
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMove('next');
          }}
          disabled={currentColumnIndex === allColumns.length - 1}
          className="flex-1 text-[10px] text-[#888888] hover:text-white bg-[#1a1a1f] hover:bg-[#27272a] px-2 py-1 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Move →
        </button>
      </div>
    </div>
  );
}
