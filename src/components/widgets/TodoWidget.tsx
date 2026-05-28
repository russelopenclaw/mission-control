'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  created_at: string;
  completed_at: string | null;
  priority: string;
  notes: string;
}

export default function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showNotesId, setShowNotesId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTodos(data.todos || []);
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
    const interval = setInterval(fetchTodos, 30000);
    return () => clearInterval(interval);
  }, []);

  const addTodo = async () => {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewText('');
      await fetchTodos();
    } catch (err) {
      console.error('Failed to add todo:', err);
    } finally {
      setAdding(false);
    }
  };

  const toggleTodo = async (id: number, done: boolean) => {
    try {
      await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, done: !done }),
      });
      await fetchTodos();
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      await fetchTodos();
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditNotes(todo.notes || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) return;
    setSaving(true);
    try {
      await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, text, notes: editNotes }),
      });
      setEditingId(null);
      await fetchTodos();
    } catch (err) {
      console.error('Failed to save edit:', err);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditNotes('');
  };

  const saveNotesInline = async (id: number, notes: string) => {
    try {
      await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes }),
      });
      await fetchTodos();
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !adding) {
      addTodo();
    }
  };

  const pending = todos.filter(t => !t.done);
  const completed = todos.filter(t => t.done);
  const [showCompleted, setShowCompleted] = useState(false);

  if (loading) {
    return (
      <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
        <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">
          To Do
        </h2>
        <div className="text-[#71717a] text-sm">Loading...</div>
      </div>
    );
  }

  const renderTodo = (todo: Todo) => {
    const isEditing = editingId === todo.id;
    const isShowingNotes = showNotesId === todo.id && !isEditing;
    const hasNotes = todo.notes && todo.notes.trim().length > 0;

    if (isEditing) {
      return (
        <div className="py-2 px-2 rounded-md bg-[#1a1a1f] space-y-2">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !saving) saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="w-full bg-[#0d0d0f] border border-[#5e6ad2]/40 rounded-md px-3 py-2 text-sm text-[#e8e8e8] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            autoFocus
          />
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes..."
            rows={2}
            className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-xs text-[#a1a1a1] placeholder-[#525252] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelEdit}
              className="text-xs px-3 py-1.5 rounded-md text-[#888888] hover:text-[#e8e8e8] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving || !editText.trim()}
              className="text-xs px-3 py-1.5 rounded-md bg-[#5e6ad2] hover:bg-[#4e5ac2] disabled:opacity-40 text-white transition-colors"
            >
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="group py-2 px-2 rounded-md hover:bg-[#1a1a1f] transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleTodo(todo.id, todo.done)}
            className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
              todo.done
                ? 'bg-[#22c55e]/20 border-[#22c55e]'
                : 'border-[#3a3a4a] hover:border-[#22c55e]'
            }`}
            aria-label={todo.done ? 'Mark as not done' : 'Mark as done'}
            title={todo.done ? 'Mark as not done' : 'Mark as done'}
          >
            {todo.done && <span className="text-[#22c55e] text-xs">✓</span>}
          </button>
          <span className={`text-sm flex-1 min-w-0 truncate ${
            todo.done ? 'text-[#525252] line-through' : 'text-[#e8e8e8]'
          }`}>
            {todo.text}
          </span>
          {hasNotes && (
            <button
              onClick={() => setShowNotesId(isShowingNotes ? null : todo.id)}
              className="flex-shrink-0 text-[10px] text-[#5e6ad2] hover:text-[#8b93e0] transition-colors"
              title="Toggle notes"
            >
              📝
            </button>
          )}
          {!hasNotes && !todo.done && (
            <button
              onClick={() => {
                setShowNotesId(todo.id);
                setTimeout(() => {
                  const el = document.querySelector(`[data-notes-id="${todo.id}"]`) as HTMLTextAreaElement;
                  el?.focus();
                }, 50);
              }}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[10px] text-[#525252] hover:text-[#5e6ad2] transition-all"
              title="Add notes"
            >
              📝
            </button>
          )}
          <button
            onClick={() => startEditing(todo)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[#525252] hover:text-[#e8e8e8] transition-all text-xs"
            aria-label="Edit"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => deleteTodo(todo.id)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[#525252] hover:text-[#ef4444] transition-all text-xs"
            aria-label="Delete"
            title="Delete"
          >
            ✕
          </button>
        </div>
        {/* Notes display / inline edit */}
        {isShowingNotes && (
          <div className="mt-1 ml-8">
            {hasNotes && !isShowingNotes ? null : (
              <textarea
                data-notes-id={todo.id}
                defaultValue={todo.notes || ''}
                placeholder="Add notes..."
                rows={2}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== (todo.notes || '').trim()) {
                    saveNotesInline(todo.id, val);
                  }
                  if (!val && !todo.notes?.trim()) {
                    setShowNotesId(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowNotesId(null);
                  }
                }}
                className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-xs text-[#a1a1a1] placeholder-[#525252] focus:outline-none focus:border-[#5e6ad2] transition-colors resize-none"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide">
          ✅ To Do
        </h2>
        {pending.length > 0 && (
          <span className="text-xs text-[#525252]">{pending.length} pending</span>
        )}
      </div>

      {/* Add new todo */}
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a to do..."
          className="flex-1 bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-[#e8e8e8] placeholder-[#525252] focus:outline-none focus:border-[#5e6ad2] transition-colors"
          disabled={adding}
        />
        <button
          onClick={addTodo}
          disabled={adding || !newText.trim()}
          className="bg-[#5e6ad2] hover:bg-[#4e5ac2] disabled:bg-[#2a2a3a] disabled:text-[#525252] text-white text-sm px-3 py-2 rounded-md transition-colors min-h-[44px]"
        >
          {adding ? '...' : '+'}
        </button>
      </div>

      {/* Pending todos */}
      {pending.length === 0 && !showCompleted ? (
        <div className="text-[#525252] text-sm text-center py-4">
          No pending items — add one above
        </div>
      ) : (
        <div className="space-y-1">
          {pending.map(todo => (
            <div key={todo.id}>{renderTodo(todo)}</div>
          ))}
        </div>
      )}

      {/* Completed toggle */}
      {completed.length > 0 && (
        <div className="mt-2 border-t border-[#27272a] pt-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs text-[#525252] hover:text-[#a1a1a1] transition-colors flex items-center gap-1"
          >
            <span className="text-[10px]">{showCompleted ? '▼' : '▶'}</span>
            {completed.length} completed
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-1">
              {completed.map(todo => (
                <div key={todo.id}>{renderTodo(todo)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}