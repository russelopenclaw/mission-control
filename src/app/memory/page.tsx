'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MemoryStats from '@/components/memory/MemoryStats';
import DailyMemoryList from '@/components/memory/DailyMemoryList';
import LongTermMemory from '@/components/memory/LongTermMemory';
import MemorySearch from '@/components/memory/MemorySearch';

type MemoryView = 'daily' | 'longterm' | 'search';

interface SearchResult {
  source: string;
  date: string;
  content: string;
  matchPreview: string;
  score: number;
}

export default function MemoryPage() {
  const [activeView, setActiveView] = useState<MemoryView>('daily');
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result);
    if (result.source === 'daily' && result.date !== 'MEMORY.md') {
      setActiveView('daily');
    } else {
      setActiveView('longterm');
    }
  };

  const handleViewChange = (view: MemoryView) => {
    setActiveView(view);
    setSelectedResult(null);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-white mb-2">🧠 Memory</h1>
        <p className="text-sm text-[#888888]">
          Browse daily memories and long-term knowledge
        </p>
      </div>

      <MemoryStats onViewChange={handleViewChange} />

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 bg-[#151518] border border-[#27272a] rounded-md p-1 w-fit">
        <button
          onClick={() => setActiveView('daily')}
          className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
            activeView === 'daily'
              ? 'bg-[#5e6ad2] text-white'
              : 'text-[#888888] hover:text-white hover:bg-[#1a1a1f]'
          }`}
        >
          📅 Daily
        </button>
        <button
          onClick={() => setActiveView('longterm')}
          className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
            activeView === 'longterm'
              ? 'bg-[#5e6ad2] text-white'
              : 'text-[#888888] hover:text-white hover:bg-[#1a1a1f]'
          }`}
        >
          📚 Long-term
        </button>
        <button
          onClick={() => setActiveView('search')}
          className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
            activeView === 'search'
              ? 'bg-[#5e6ad2] text-white'
              : 'text-[#888888] hover:text-white hover:bg-[#1a1a1f]'
          }`}
        >
          🔍 Search
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {activeView === 'daily' && (
          <DailyMemoryList 
            onSelectDate={(date) => {
              window.location.href = `/memory/${date}`;
            }}
          />
        )}
        
        {activeView === 'longterm' && (
          <LongTermMemory />
        )}
        
        {activeView === 'search' && (
          <MemorySearch onSelectResult={handleSelectResult} />
        )}
      </div>

      {/* Selected Result Preview */}
      {selectedResult && (
        <div className="fixed bottom-4 right-4 bg-[#151518] border border-[#27272a] rounded-lg p-4 max-w-md shadow-lg">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs font-medium text-[#5e6ad2]">
                {selectedResult.source === 'daily' ? selectedResult.date : 'Long-term Memory'}
              </p>
              <p className="text-xs text-[#888888] mt-1">
                Score: {Math.round(selectedResult.score * 100)}%
              </p>
            </div>
            <button
              onClick={() => setSelectedResult(null)}
              className="text-[#888888] hover:text-white text-lg"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-[#a1a1a1] line-clamp-3">
            {selectedResult.matchPreview}
          </p>
          <button
            onClick={() => {
              if (selectedResult.source === 'daily' && selectedResult.date !== 'MEMORY.md') {
                window.location.href = `/memory/${selectedResult.date}`;
              }
              setSelectedResult(null);
            }}
            className="mt-2 text-xs bg-[#5e6ad2] hover:bg-[#4f5bb5] text-white px-3 py-1.5 rounded-md transition-colors"
          >
            View Full Memory
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
