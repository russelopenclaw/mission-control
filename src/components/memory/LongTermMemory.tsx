'use client';

import React, { useState, useEffect } from 'react';

interface Section {
  title: string;
  content: string;
}

export default function LongTermMemory() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([]));

  useEffect(() => {
    fetch('/api/memory/longterm')
      .then(res => res.json())
      .then(data => {
        if (data.exists && data.sections) {
          setSections(data.sections);
          // Expand the first section by default
          if (data.sections.length > 0) {
            setExpandedSections(new Set([data.sections[0].title]));
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch long-term memory:', err);
        setLoading(false);
      });
  }, []);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const renderMarkdown = (content: string) => {
    return content
      .replace(/^### (.+)$/gm, '<h3 class="text-md font-medium text-[#e8e8e8] mt-3 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '') // Don't render the section header again
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-medium text-[#5e6ad2] mt-3 mb-2">$1</h1>')
      .replace(/^[-*] (.+)$/gm, '<li class="text-sm text-[#a1a1a1] ml-4 list-disc">$1</li>')
      .replace(/^\d+\.\s(.+)$/gm, '<li class="text-sm text-[#a1a1a1] ml-4 list-decimal">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e8e8e8]">$1</strong>')
      .replace(/```([^`]+)```/g, '<pre class="bg-[#0d0d0f] border border-[#27272a] rounded p-3 my-2 overflow-x-auto"><code class="text-xs text-[#a1a1a1]">$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-[#0d0d0f] text-[#5e6ad2] px-1.5 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  if (loading) {
    return (
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
        <p className="text-[#888888] text-sm text-center py-8">No long-term memory found</p>
      </div>
    );
  }

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
      <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Long-term Memory</h2>
      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.title);
          
          return (
            <div key={section.title} className="bg-[#0d0d0f] border border-[#27272a] rounded-md">
              <div
                className="p-3 cursor-pointer hover:bg-[#1a1a1f] transition-colors flex items-center justify-between"
                onClick={() => toggleSection(section.title)}
              >
                <h3 className="text-sm font-medium text-[#e8e8e8]">{section.title}</h3>
                <div className={`text-[#888888] transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-[#27272a] p-4 bg-[#0d0d0f]/50">
                  <div 
                    className="prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
