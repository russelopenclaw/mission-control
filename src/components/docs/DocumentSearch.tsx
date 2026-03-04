'use client';

import React from 'react';

interface DocumentSearchProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  query: string;
}

export default function DocumentSearch({ onSearch, onClear, query }: DocumentSearchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const handleClear = () => {
    onClear();
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search documents..."
        className="w-full px-4 py-2 bg-[#151518] border border-[#2a2a2d] rounded-lg text-[#e0e0e0] placeholder-[#666] focus:outline-none focus:border-[#5e6ad2] transition-colors"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#e0e0e0] transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
