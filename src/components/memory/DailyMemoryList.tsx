'use client';

import React, { useState, useEffect } from 'react';

interface DailyMemoryItem {
  date: string;
  title: string | null;
  memoryCount: number;
  preview: string;
  filePath: string;
}

interface DailyMemoryListProps {
  onSelectDate: (date: string) => void;
}

export default function DailyMemoryList({ onSelectDate }: DailyMemoryListProps) {
  const [memories, setMemories] = useState<DailyMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<string>('');

  useEffect(() => {
    fetch('/api/memory/daily')
      .then(res => res.json())
      .then(data => {
        setMemories(data.memories);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch daily memories:', err);
        setLoading(false);
      });
  }, []);

  const handleExpand = async (date: string) => {
    if (expandedDate === date) {
      setExpandedDate(null);
      setExpandedContent('');
      return;
    }

    setExpandedDate(date);
    try {
      const res = await fetch(`/api/memory/daily/${date}`);
      const data = await res.json();
      if (data.exists && data.content) {
        setExpandedContent(data.content);
      }
    } catch (err) {
      console.error('Failed to fetch memory content:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering
    return content
      .replace(/^### (.+)$/gm, '<h3 class="text-md font-medium text-[#e8e8e8] mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-medium text-white mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-medium text-[#5e6ad2] mt-4 mb-2">$1</h1>')
      .replace(/^- (.+)$/gm, '<li class="text-sm text-[#a1a1a1] ml-4">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-[#a1a1a1] ml-4">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e8e8e8]">$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  if (loading) {
    return (
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <p className="text-[#888888] text-sm text-center py-8">No daily memories found</p>
      </div>
    );
  }

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
      <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Daily Memories</h2>
      <div className="space-y-2">
        {memories.map((memory) => (
          <div key={memory.date} className="bg-[#0d0d0f] border border-[#27272a] rounded-md">
            <div
              className="p-3 cursor-pointer hover:bg-[#1a1a1f] transition-colors"
              onClick={() => handleExpand(memory.date)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#5e6ad2]">{memory.date}</span>
                    <span className="text-[10px] text-[#525252]">• {formatDate(memory.date)}</span>
                  </div>
                  {memory.title && (
                    <h3 className="text-sm font-medium text-[#e8e8e8] mb-1">{memory.title}</h3>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[#888888]">
                    <span>{memory.memoryCount} entries</span>
                    {expandedDate === memory.date && (
                      <span className="text-[#5e6ad2]">• Click to collapse</span>
                    )}
                  </div>
                </div>
                <div className={`text-[#888888] transform transition-transform ${expandedDate === memory.date ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </div>
            </div>
            {expandedDate === memory.date && expandedContent && (
              <div className="border-t border-[#27272a] p-4 bg-[#0d0d0f]/50">
                <div 
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(expandedContent) }}
                />
                <button
                  onClick={() => onSelectDate(memory.date)}
                  className="mt-3 text-xs bg-[#5e6ad2] hover:bg-[#4f5bb5] text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  Open Full Memory
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
