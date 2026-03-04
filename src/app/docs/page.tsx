'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DocumentList from '@/components/docs/DocumentList';
import DocumentViewer from '@/components/docs/DocumentViewer';
import DocumentSearch from '@/components/docs/DocumentSearch';

interface Document {
  filename: string;
  title: string;
  modifiedAt: string;
  wordCount: number;
  filePath: string;
  keywords: string[];
}

interface DocumentContent {
  filename: string;
  content: string;
  metadata: {
    modifiedAt: string;
    size: number;
  };
}

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<DocumentContent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all documents
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/docs');
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
        setError(null);
      } else {
        setError(data.error || 'Failed to load documents');
      }
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-refresh with file watching (poll every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDocuments();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDocuments]);

  // Filter documents by search query
  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return documents;
    }

    const query = searchQuery.toLowerCase();
    return documents.filter(doc => {
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.filename.toLowerCase().includes(query) ||
        doc.keywords.some(k => k.toLowerCase().includes(query))
      );
    });
  }, [documents, searchQuery]);

  // Fetch selected document content
  useEffect(() => {
    const fetchDocumentContent = async () => {
      if (!selectedFilename) {
        setSelectedContent(null);
        return;
      }

      try {
        const response = await fetch(`/api/docs/${encodeURIComponent(selectedFilename)}`);
        const data = await response.json();
        
        if (data.success) {
          setSelectedContent(data);
        } else {
          setError(data.error || 'Failed to load document');
        }
      } catch (err) {
        setError('Failed to load document');
        console.error('Error fetching document content:', err);
      }
    };

    fetchDocumentContent();
  }, [selectedFilename]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleSelectDocument = (filename: string) => {
    setSelectedFilename(filename);
  };

  const handleSortChange = (sortBy: 'name' | 'date') => {
    setSortBy(sortBy);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-200px)] flex flex-col">
        {/* Page Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-medium text-white">📚 Documentation</h1>
              <p className="text-sm text-[#888888] mt-1">
                Browse and search project documentation
              </p>
            </div>
            <button
              onClick={fetchDocuments}
              className="text-sm text-[#5e6ad2] hover:text-[#7a85e8] transition-colors font-medium"
            >
              ↻ Refresh
            </button>
          </div>
          <DocumentSearch
            onSearch={handleSearch}
            onClear={handleClearSearch}
            query={searchQuery}
          />
          {searchQuery && (
            <p className="mt-2 text-sm text-[#888]">
              Found {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
            </p>
          )}
        </div>

        {/* Main Content - Two Panel Layout */}
        <div className="flex-1 flex overflow-hidden bg-[#151518] border border-[#27272a] rounded-lg">
          {/* Left Panel - Document List (30%) */}
          <div className="w-[30%] border-r border-[#27272a] overflow-hidden">
            {loading ? (
              <div className="p-4 text-center text-[#666]">Loading documents...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-400">{error}</div>
            ) : (
              <DocumentList
                documents={filteredDocuments}
                selectedFilename={selectedFilename}
                onSelectDocument={handleSelectDocument}
                sortBy={sortBy}
                onSortChange={handleSortChange}
              />
            )}
          </div>

          {/* Right Panel - Document Viewer (70%) */}
          <div className="w-[70%] overflow-hidden bg-[#0d0d0f]">
            {selectedContent ? (
              <DocumentViewer
                content={selectedContent.content}
                filename={selectedContent.filename}
                modifiedAt={selectedContent.metadata.modifiedAt}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[#666]">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-lg">Select a document to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
