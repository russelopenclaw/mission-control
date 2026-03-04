'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

function MemoryDetailContent() {
  const searchParams = useSearchParams();
  const date = searchParams.get('date');
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setError('No date specified');
      setLoading(false);
      return;
    }

    fetch(`/api/memory/daily/${date}`)
      .then(res => {
        if (!res.ok) throw new Error('Memory not found');
        return res.json();
      })
      .then(data => {
        setContent(data.content);
        const titleMatch = data.content.match(/^#\s+(.+)$/m);
        setTitle(titleMatch ? titleMatch[1] : date);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch memory:', err);
        setError('Failed to load memory');
        setLoading(false);
      });
  }, [date]);

  const renderMarkdown = (mdContent: string) => {
    return mdContent
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium text-[#e8e8e8] mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-medium text-white mt-5 mb-3">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-medium text-[#5e6ad2] mt-5 mb-3">$1</h1>')
      .replace(/^[-*] (.+)$/gm, '<li class="text-sm text-[#a1a1a1] ml-4 list-disc pl-2">$1</li>')
      .replace(/^\d+\.\s(.+)$/gm, '<li class="text-sm text-[#a1a1a1] ml-4 list-decimal pl-2">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e8e8e8]">$1</strong>')
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-[#0d0d0f] border border-[#27272a] rounded p-3 my-3 overflow-x-auto"><code class="text-xs text-[#a1a1a1]">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-[#0d0d0f] text-[#5e6ad2] px-1.5 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n\n/g, '</p><p class="text-sm text-[#a1a1a1] my-2">')
      .replace(/\n/g, '<br/>');
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <a 
          href="/memory" 
          className="inline-flex items-center text-sm text-[#888888] hover:text-[#e8e8e8] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="mr-1">
            <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
          Back to Memories
        </a>
      </div>

      {loading && (
        <div className="bg-[#151518] border border-[#27272a] rounded-lg p-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-8 bg-[#0d0d0f] rounded w-3/4" />
            <div className="h-4 bg-[#0d0d0f] rounded w-full" />
            <div className="h-4 bg-[#0d0d0f] rounded w-full" />
            <div className="h-4 bg-[#0d0d0f] rounded w-2/3" />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-[#151518] border border-[#ef4444] rounded-lg p-6">
          <p className="text-[#ef4444] text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && content && (
        <div className="bg-[#151518] border border-[#27272a] rounded-lg p-6">
          <div className="mb-6 pb-4 border-b border-[#27272a]">
            <h1 className="text-2xl font-medium text-white mb-2">{title}</h1>
            {date && (
              <p className="text-sm text-[#888888]">{formatFullDate(date)}</p>
            )}
          </div>
          <div 
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
      )}
    </div>
  );
}

export default function DailyMemoryDetailPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-[#151518] border border-[#27272a] rounded-lg p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-8 bg-[#0d0d0f] rounded w-3/4" />
              <div className="h-4 bg-[#0d0d0f] rounded w-full" />
            </div>
          </div>
        </div>
      }>
        <MemoryDetailContent />
      </Suspense>
    </DashboardLayout>
  );
}
