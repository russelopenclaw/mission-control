'use client';

import React, { useState } from 'react';

interface SearchResult {
  source: string;
  date: string;
  content: string;
  matchPreview: string;
  score: number;
}

interface MemorySearchProps {
  onSelectResult: (result: SearchResult) => void;
}

export default function MemorySearch({ onSelectResult }: MemorySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery && !dateFrom && !dateTo) {
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/memory/search?${params.toString()}`);
      const data = await res.json();
      
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error('Failed to search memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setResults([]);
    setHasSearched(false);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-[#5e6ad2]/30 text-[#e8e8e8] px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
      <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Search Memories</h2>
      
      <form onSubmit={handleSearch} className="space-y-3 mb-4">
        <div>
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-[#e8e8e8] placeholder-[#525252] focus:border-[#5e6ad2] focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-[#e8e8e8] placeholder-[#525252] focus:border-[#5e6ad2] focus:outline-none"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-[#0d0d0f] border border-[#27272a] rounded-md px-3 py-2 text-sm text-[#e8e8e8] placeholder-[#525252] focus:border-[#5e6ad2] focus:outline-none"
            placeholder="To"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || (!searchQuery && !dateFrom && !dateTo)}
            className="bg-[#5e6ad2] hover:bg-[#4f5bb5] disabled:bg-[#27272a] disabled:text-[#525252] text-white text-sm px-4 py-2 rounded-md transition-colors flex-1"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={clearSearch}
            className="bg-[#1a1a1f] hover:bg-[#27272a] text-[#888888] text-sm px-4 py-2 rounded-md transition-colors"
          >
            Clear
          </button>
        </div>
      </form>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 h-16 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <p className="text-[#888888] text-sm text-center py-8">No results found</p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[#888888] mb-2">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          {results.map((result, index) => (
            <div
              key={index}
              className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 cursor-pointer hover:bg-[#1a1a1f] transition-colors"
              onClick={() => onSelectResult(result)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[#5e6ad2]">
                  {result.source === 'daily' ? result.date : 'Long-term'}
                </span>
                <span className="text-[10px] text-[#525252]">
                  Score: {Math.round(result.score * 100)}%
                </span>
              </div>
              <p className="text-sm text-[#a1a1a1] line-clamp-3">
                {highlightMatch(result.matchPreview, searchQuery)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
