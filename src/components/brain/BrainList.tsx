'use client';

import React, { useState, useMemo } from 'react';
import BrainItem from './BrainItem';

interface BrainItemData {
  id: string;
  type: 'link' | 'article' | 'video' | 'note';
  title: string;
  url: string;
  content: string;
  keywords: string[];
  createdAt: string;
  metadata?: {
    domain?: string;
    author?: string;
  };
}

interface BrainListProps {
  items: BrainItemData[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onItemTypeClick?: (type: 'link' | 'article' | 'video' | 'note') => void;
  onItemSelect?: (item: BrainItemData) => void;
  onDeleteItem?: (id: string) => void;
}

type SortOption = 'date' | 'title' | 'type';
type FilterType = 'all' | 'link' | 'article' | 'video' | 'note';

export default function BrainList({
  items,
  searchQuery = '',
  onSearchChange,
  onItemTypeClick,
  onItemSelect,
  onDeleteItem,
}: BrainListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Filter items by search query and type
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.keywords.some(k => k.toLowerCase().includes(query))
        );
      });
    }
    
    return result;
  }, [items, filterType, searchQuery]);

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'type':
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'date':
      default:
        sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
    
    return sorted;
  }, [filteredItems, sortBy]);

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilterType(newFilter);
    onItemTypeClick?.(newFilter as 'link' | 'article' | 'video' | 'note');
  };

  const handleDelete = (id: string) => {
    onDeleteItem?.(id);
  };

  const handleItemClick = (item: BrainItemData) => {
    if (item.url) {
      // Open URL in new tab
      window.open(item.url, '_blank');
    }
    onItemSelect?.(item);
  };

  // Count items by type
  const typeCounts = useMemo(() => {
    const counts = {
      all: items.length,
      link: items.filter(i => i.type === 'link').length,
      article: items.filter(i => i.type === 'article').length,
      video: items.filter(i => i.type === 'video').length,
      note: items.filter(i => i.type === 'note').length,
    };
    return counts;
  }, [items]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter & Sort Controls */}
      <div className="px-4 py-3 border-b border-[#2a2a2d] space-y-3">
        {/* Type Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            <FilterChip
              label="All"
              count={typeCounts.all}
              isActive={filterType === 'all'}
              onClick={() => handleFilterChange('all')}
            />
            <FilterChip
              label="🔗 Links"
              count={typeCounts.link}
              isActive={filterType === 'link'}
              onClick={() => handleFilterChange('link')}
            />
            <FilterChip
              label="📄 Articles"
              count={typeCounts.article}
              isActive={filterType === 'article'}
              onClick={() => handleFilterChange('article')}
            />
            <FilterChip
              label="🎥 Videos"
              count={typeCounts.video}
              isActive={filterType === 'video'}
              onClick={() => handleFilterChange('video')}
            />
            <FilterChip
              label="📝 Notes"
              count={typeCounts.note}
              isActive={filterType === 'note'}
              onClick={() => handleFilterChange('note')}
            />
          </div>
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#666]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="text-xs bg-[#151518] border border-[#2a2a2d] rounded px-2 py-1 text-[#e0e0e0] focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="date">Date Saved</option>
              <option value="title">Title</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>
        
        {/* Result Count */}
        <div className="text-sm text-[#888]">
          Showing {sortedItems.length} of {items.length} items
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {sortedItems.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              <p className="text-lg text-[#666]">
                {searchQuery ? 'No items match your search' : 'No items saved yet'}
              </p>
              <p className="text-sm text-[#666] mt-2">
                {searchQuery ? 'Try a different search term' : 'Save your first link, article, or note'}
              </p>
            </div>
          </div>
        ) : (
          sortedItems.map((item) => (
            <BrainItem
              key={item.id}
              item={item}
              onClick={() => handleItemClick(item)}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, isActive, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
        isActive
          ? 'bg-[#5e6ad2] border-[#5e6ad2] text-white'
          : 'bg-[#1a1a1f] border-[#2a2a2d] text-[#888] hover:border-[#3f3f46] hover:text-[#e0e0e0]'
      }`}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );
}
