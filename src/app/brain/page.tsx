'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import BrainList from '@/components/brain/BrainList';

interface BrainItem {
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

export default function BrainPage() {
  const [items, setItems] = useState<BrainItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all brain items
  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch('/api/brain/items');
      const data = await response.json();
      
      if (data.success) {
        setItems(data.items);
        setError(null);
      } else {
        setError(data.error || 'Failed to load brain items');
      }
    } catch (err) {
      setError('Failed to load brain items');
      console.error('Error fetching brain items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchItems();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchItems]);

  // Delete item
  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/brain/items/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        console.error('Failed to delete item:', data.error);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-200px)] flex flex-col">
        {/* Page Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-medium text-white">🧠 Brain</h1>
              <p className="text-sm text-[#888888] mt-1">
                Your personal knowledge base - links, articles, videos, and notes
              </p>
            </div>
            <button
              onClick={fetchItems}
              className="text-sm text-[#5e6ad2] hover:text-[#7a85e8] transition-colors font-medium"
            >
              ↻ Refresh
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search your brain... (title, keywords, content)"
              className="w-full bg-[#151518] border border-[#27272a] rounded-lg px-4 py-2.5 pl-10 text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#5e6ad2] transition-colors"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#888]"
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
            )}
          </div>
        </div>

        {/* Main Content - Brain List */}
        <div className="flex-1 bg-[#151518] border border-[#27272a] rounded-lg overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center text-[#666]">
              Loading brain items...
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-400">
              {error}
            </div>
          ) : (
            <BrainList
              items={items}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
