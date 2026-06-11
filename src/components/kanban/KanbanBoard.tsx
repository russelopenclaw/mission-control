'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  column: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  description?: string;
  epic?: string | null;
  parentTaskId?: string | null;
  deliverables?: string | null;
  validationCriteria?: string[] | null;
  sortOrder?: number;
}

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newColumn: string) => void;
  onReorder: (orders: { id: string; column: string; sortOrder: number }[]) => void;
  onTaskClick: (task: Task) => void;
}

const COLUMNS: { id: string; title: string; color: string; description: string }[] = [
  { id: 'BACKLOG', title: 'Backlog', color: '#71717a', description: 'Ideas & future work' },
  { id: 'READY', title: 'Ready', color: '#0ea5e9', description: 'Ready to start' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: '#5e6ad2', description: 'Active work' },
  { id: 'VALIDATION', title: 'Validation', color: '#f59e0b', description: 'Testing & review' },
  { id: 'DONE', title: 'Done', color: '#22c55e', description: 'Completed' },
  { id: 'BLOCKED', title: 'Blocked', color: '#ef4444', description: 'Blocked issues' },
];

export default function KanbanBoard({ tasks, onMoveTask, onReorder, onTaskClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    // No-op: we don't move items during drag, only on drop
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);

    if (!activeTask) return;

    // Case 1: Dropped on another task — determine new column and position
    if (overTask) {
      const newColumn = overTask.column;
      const sameColumn = activeTask.column === newColumn;

      if (sameColumn) {
        // Reordering within the same column
        const columnTasks = tasks
          .filter(t => t.column === newColumn)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const oldIndex = columnTasks.findIndex(t => t.id === active.id);
        const newIndex = columnTasks.findIndex(t => t.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        const orders = reordered.map((t, i) => ({
          id: t.id,
          column: newColumn,
          sortOrder: i,
        }));
        onReorder(orders);
      } else {
        // Moving to a different column — insert at the over task's position
        const targetColumnTasks = tasks
          .filter(t => t.column === newColumn)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const overIndex = targetColumnTasks.findIndex(t => t.id === over.id);

        // Remove from old column, insert into new column at overIndex
        const newColumnTasks = targetColumnTasks.filter(t => t.id !== active.id);
        newColumnTasks.splice(overIndex, 0, activeTask);

        const orders = newColumnTasks.map((t, i) => ({
          id: t.id,
          column: newColumn,
          sortOrder: i,
        }));

        // Also update sort_order for tasks in the old column
        const oldColumnTasks = tasks
          .filter(t => t.column === activeTask.column && t.id !== active.id)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const oldOrders = oldColumnTasks.map((t, i) => ({
          id: t.id,
          column: activeTask.column,
          sortOrder: i,
        }));

        onReorder([...orders, ...oldOrders]);
        onMoveTask(active.id as string, newColumn);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map(column => {
          const columnTasks = tasks
            .filter(t => t.column === column.id)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

          return (
            <SortableContext
              key={column.id}
              items={columnTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <Column
                column={column}
                tasks={columnTasks}
                onMoveTask={onMoveTask}
                onTaskClick={onTaskClick}
              />
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <DragOverlayCard task={activeTask} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Simple array move utility
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
}

interface ColumnProps {
  column: { id: string; title: string; color: string; description: string };
  tasks: Task[];
  onMoveTask: (taskId: string, newColumn: string) => void;
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
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-[#e8e8e8] text-sm">{column.title}</h3>
            <span className="text-[10px] text-[#71717a]">{column.description}</span>
          </div>
          <span
            className="text-xs text-[#888888] bg-[#0d0d0f] px-2 py-0.5 rounded"
            style={{ borderColor: column.color, borderWidth: '1px' }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks List — droppable area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px]">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#525252] text-sm">
            No tasks
          </div>
        ) : (
          tasks.map(task => (
            <SortableTaskCard
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
  onMoveTask: (taskId: string, newColumn: string) => void;
  onTaskClick: (task: Task) => void;
  allColumns: string[];
}

function SortableTaskCard({ task, onMoveTask, onTaskClick, allColumns }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const currentColumnIndex = allColumns.findIndex(c => c === task.column);

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onMoveTask={onMoveTask}
        onTaskClick={onTaskClick}
        allColumns={allColumns}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function TaskCard({ task, onMoveTask, onTaskClick, allColumns, dragHandleProps }: TaskCardProps & {
  dragHandleProps?: Record<string, any>;
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-[#f87171]';
      case 'medium': return 'text-[#fbbf24]';
      case 'low': return 'text-[#86efac]';
      default: return 'text-[#888888]';
    }
  };

  const getAssigneeBadge = (assignee: string | null | undefined) => {
    if (!assignee || typeof assignee !== 'string') return 'bg-[#71717a]';
    switch (assignee.toLowerCase()) {
      case 'kevin': return 'bg-[#5e6ad2]';
      case 'alfred': return 'bg-[#22c55e]';
      default: return 'bg-[#71717a]';
    }
  };

  const handleMove = (direction: 'prev' | 'next') => {
    const currentColumnIndex = allColumns.findIndex(c => c === task.column);
    const newIndex = direction === 'prev'
      ? Math.max(0, currentColumnIndex - 1)
      : Math.min(allColumns.length - 1, currentColumnIndex + 1);

    const newColumn = allColumns[newIndex];
    onMoveTask(task.id, newColumn);
    setShowMoveMenu(false);
  };

  return (
    <div
      className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 hover:border-[#3f3f46] transition-colors cursor-grab active:cursor-grabbing"
      onClick={() => onTaskClick(task)}
    >
      {/* Drag handle + ID + Title */}
      <div className="flex items-start gap-1.5 mb-2">
        <span
          className="text-[11px] text-[#5e6ad2] font-mono font-semibold shrink-0 leading-5 bg-[#5e6ad2]/10 px-1.5 py-0.5 rounded"
        >
          {task.id}
        </span>
        {/* Drag handle icon */}
        <span
          className="text-[#525252] hover:text-[#888888] cursor-grab active:cursor-grabbing shrink-0 leading-5 text-sm"
          {...(dragHandleProps || {})}
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </span>
        <h4 className="font-medium text-[#e8e8e8] text-sm line-clamp-2">
          {task.title}
        </h4>
      </div>

      {/* Epic Badge */}
      {task.epic && (
        <div className="mb-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#5e6ad2]/20 text-[#a5b4fc] border border-[#5e6ad2]/30">
            🎯 {task.epic}
          </span>
        </div>
      )}

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
          onClick={(e) => { e.stopPropagation(); handleMove('prev'); }}
          disabled={allColumns.findIndex(c => c === task.column) === 0}
          className="flex-1 text-[10px] text-[#888888] hover:text-white bg-[#1a1a1f] hover:bg-[#27272a] px-2 py-1 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Move
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleMove('next'); }}
          disabled={allColumns.findIndex(c => c === task.column) === allColumns.length - 1}
          className="flex-1 text-[10px] text-[#888888] hover:text-white bg-[#1a1a1f] hover:bg-[#27272a] px-2 py-1 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Move →
        </button>
      </div>
    </div>
  );
}

/** Rendered during drag — follows the cursor */
function DragOverlayCard({ task }: { task: Task }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-[#f87171]';
      case 'medium': return 'text-[#fbbf24]';
      case 'low': return 'text-[#86efac]';
      default: return 'text-[#888888]';
    }
  };

  const getAssigneeBadge = (assignee: string | null | undefined) => {
    if (!assignee || typeof assignee !== 'string') return 'bg-[#71717a]';
    switch (assignee.toLowerCase()) {
      case 'kevin': return 'bg-[#5e6ad2]';
      case 'alfred': return 'bg-[#22c55e]';
      default: return 'bg-[#71717a]';
    }
  };

  return (
    <div className="bg-[#0d0d0f] border border-[#5e6ad2] rounded-md p-3 shadow-2xl shadow-black/50 w-72 opacity-95 rotate-[1deg]">
      <div className="flex items-start gap-1.5 mb-2">
        <span className="text-[11px] text-[#5e6ad2] font-mono font-semibold shrink-0 leading-5 bg-[#5e6ad2]/10 px-1.5 py-0.5 rounded">
          {task.id}
        </span>
        <h4 className="font-medium text-[#e8e8e8] text-sm line-clamp-2">
          {task.title}
        </h4>
      </div>
      {task.epic && (
        <div className="mb-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#5e6ad2]/20 text-[#a5b4fc] border border-[#5e6ad2]/30">
            🎯 {task.epic}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs">
        <span className={getPriorityColor(task.priority)}>⚡ {task.priority}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${getAssigneeBadge(task.assignee)}`}>
          {task.assignee}
        </span>
      </div>
    </div>
  );
}