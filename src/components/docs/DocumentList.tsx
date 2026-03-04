'use client';

import React from 'react';

interface Document {
  filename: string;
  title: string;
  modifiedAt: string;
  wordCount: number;
  keywords: string[];
}

interface DocumentListProps {
  documents: Document[];
  selectedFilename: string | null;
  onSelectDocument: (filename: string) => void;
  sortBy: 'name' | 'date';
  onSortChange: (sortBy: 'name' | 'date') => void;
}

export default function DocumentList({
  documents,
  selectedFilename,
  onSelectDocument,
  sortBy,
  onSortChange,
}: DocumentListProps) {
  const sortedDocuments = React.useMemo(() => {
    const sorted = [...documents];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.filename.localeCompare(b.filename));
    } else {
      sorted.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    }
    return sorted;
  }, [documents, sortBy]);

  return (
    <div className="h-full flex flex-col">
      {/* Sort Controls */}
      <div className="px-4 py-3 border-b border-[#2a2a2d]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#888]">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#666]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'name' | 'date')}
              className="text-xs bg-[#151518] border border-[#2a2a2d] rounded px-2 py-1 text-[#e0e0e0] focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="name">Name</option>
              <option value="date">Date Modified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-auto">
        {sortedDocuments.length === 0 ? (
          <div className="p-4 text-center text-[#666] text-sm">
            No documents found
          </div>
        ) : (
          <ul className="py-2">
            {sortedDocuments.map((doc) => (
              <li
                key={doc.filename}
                onClick={() => onSelectDocument(doc.filename)}
                className={`px-4 py-3 cursor-pointer transition-colors border-l-2 ${
                  selectedFilename === doc.filename
                    ? 'bg-[#151518] border-[#5e6ad2]'
                    : 'border-transparent hover:bg-[#1a1a1d]'
                }`}
              >
                <div className="mb-2">
                  <h3 className="font-medium text-[#e0e0e0] truncate mb-1.5">
                    {doc.title}
                  </h3>
                  {/* Keywords/Topics */}
                  {doc.keywords && doc.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {doc.keywords.slice(0, 5).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#27272a] text-[#888888] border border-[#3f3f46]"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-[#666]">
                  <span className="font-mono bg-[#0d0d0f] px-1.5 py-0.5 rounded">
                    {doc.filename}
                  </span>
                  <span>
                    {new Date(doc.modifiedAt).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
