'use client';

import React from 'react';
import { getTypeBadge } from '@/lib/brain/types';

interface BrainItemProps {
  item: {
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
  };
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

export default function BrainItem({ item, onClick, onDelete }: BrainItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking delete button
    if ((e.target as HTMLElement).closest('.delete-btn')) {
      return;
    }
    onClick?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group p-4 bg-[#151518] hover:bg-[#1a1a1f] border border-[#27272a] hover:border-[#5e6ad2]/50 rounded-lg cursor-pointer transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Type Badge */}
          <span className="text-lg flex-shrink-0" title={item.type}>
            {getTypeBadge(item.type)}
          </span>
          
          {/* Title */}
          <h3 className="font-medium text-[#e0e0e0] truncate flex-1">
            {item.title}
          </h3>
        </div>
        
        {/* Delete Button (show on hover) */}
        <button
          onClick={handleDeleteClick}
          className="delete-btn opacity-0 group-hover:opacity-100 text-[#666] hover:text-red-400 transition-all p-1"
          title="Delete item"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      
      {/* Keywords/Tags */}
      {item.keywords && item.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.keywords.slice(0, 5).map((keyword, idx) => (
            <span
              key={idx}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#27272a] text-[#888888] border border-[#3f3f46] hover:border-[#5e6ad2]/50 transition-colors"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
      
      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-[#666]">
        <div className="flex items-center gap-2">
          {/* Domain/Source */}
          {item.metadata?.domain && (
            <span className="font-mono bg-[#0d0d0f] px-1.5 py-0.5 rounded text-[#888]">
              {item.metadata.domain.replace('www.', '')}
            </span>
          )}
          
          {/* Date Saved */}
          <span className="flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatDate(item.createdAt)}
          </span>
        </div>
        
        {/* External Link Icon */}
        {item.url && (
          <span className="text-[#5e6ad2] opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
