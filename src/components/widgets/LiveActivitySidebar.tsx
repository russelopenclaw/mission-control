'use client';

import React, { useState, useEffect } from 'react';

interface AgentStatusData {
  status: 'working' | 'idle';
  currentTask?: string;
  lastActivity: string;
}

interface SubagentStatus {
  runId: string;
  label: string;
  task: string;
  status: string;
  runtime: string;
  totalTokens: number;
  startedAt: string;
  lastUpdated?: string;
  completedAt?: string;
}

interface LiveActivitySidebarProps {
  agents: {
    [key: string]: AgentStatusData;
  };
}

export default function LiveActivitySidebar({ agents }: LiveActivitySidebarProps) {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [subagents, setSubagents] = useState<{ active: SubagentStatus[]; recent: SubagentStatus[] }>({ active: [], recent: [] });
  const [expandedSubagent, setExpandedSubagent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Collapse by default on mobile
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsCollapsed(window.innerWidth < 768);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchSubagents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subagents');
      const data = await res.json();
      setSubagents(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch subagents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Update timestamp whenever agents data changes
    setLastUpdate(new Date());
  }, [agents]);

  useEffect(() => {
    // Fetch subagents on mount
    fetchSubagents();
    
    // Poll every 10 seconds (faster than previous 30s)
    const interval = setInterval(fetchSubagents, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-[#22c55e]';
      case 'running': return 'bg-[#3b82f6]';
      case 'idle': return 'bg-[#eab308]';
      case 'done': return 'bg-[#71717a]';
      case 'error': return 'bg-[#ef4444]';
      default: return 'bg-[#71717a]';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'working': return 'bg-[#064e3b] text-[#86efac]';
      case 'running': return 'bg-[#1e3a8a] text-[#93c5fd]';
      case 'idle': return 'bg-[#422006] text-[#fde68a]';
      case 'done': return 'bg-[#27272a] text-[#a1a1a1]';
      case 'error': return 'bg-[#450a0a] text-[#fca5a5]';
      default: return 'bg-[#27272a] text-[#a1a1a1]';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-[#151518] border-l border-[#27272a] h-full flex flex-col overflow-hidden">
      {/* Header with shadow separator */}
      <div 
        className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#151518]/95 backdrop-blur-sm sticky top-0 cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 flex-1">
          <button 
            className="text-[#888888] hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg 
              className={`w-5 h-5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <h2 className="text-sm font-medium text-[#888888] uppercase tracking-wide">
            Live Activity
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse"></div>
          <span className="text-[10px] text-[#525252]">
            {getRelativeTime(lastUpdate.toISOString())}
          </span>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none h-0 p-0' : 'opacity-100'}`}>
        <div className="space-y-3">
          {/* Main Agent Section */}
          <div className="mb-4">
            <h3 className="text-[10px] font-medium text-[#525252] uppercase tracking-wide mb-2">
              Main Agent
            </h3>
            {Object.entries(agents).map(([name, data]) => (
              <div 
                key={name}
                className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(data.status)}`}></div>
                  <span className="font-medium text-[#e8e8e8] text-sm capitalize">
                    {name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${getStatusBadgeClass(data.status)}`}>
                    {data.status}
                  </span>
                </div>

                {data.currentTask && (
                  <p className="text-xs text-[#a1a1a1] ml-4.5 mb-1.5 line-clamp-2" title={data.currentTask}>
                    <span className="text-[#525252]">Working on:</span> {data.currentTask}
                  </p>
                )}

                {data.lastActivity && (
                  <p className="text-[10px] text-[#525252] ml-4.5">
                    Last active: {getRelativeTime(data.lastActivity)}
                  </p>
                )}
              </div>
            ))}

            {Object.keys(agents).length === 0 && (
              <div className="flex items-center justify-center h-16 text-[#525252] text-sm bg-[#0d0d0f] border border-[#27272a] rounded-md">
                No main agent online
              </div>
            )}
          </div>

          {/* Subagents Section */}
          <div>
            <h3 className="text-[10px] font-medium text-[#525252] uppercase tracking-wide mb-2">
              Subagents {subagents.active.length > 0 && `(${subagents.active.length})`}
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-16 text-[#525252] text-sm">
                Loading...
              </div>
            ) : subagents.active.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-[#525252] text-sm bg-[#0d0d0f] border border-[#27272a] rounded-md">
                No active subagents
              </div>
            ) : (
              <div className="space-y-2">
                {subagents.active.map((subagent) => (
                  <div 
                    key={subagent.runId}
                    className="bg-[#0d0d0f] border border-[#27272a] rounded-md overflow-hidden cursor-pointer hover:border-[#3b82f6]/50 transition-colors"
                    onClick={() => setExpandedSubagent(expandedSubagent === subagent.runId ? null : subagent.runId)}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(subagent.status)}`}></div>
                        <span className="font-medium text-[#e8e8e8] text-sm truncate flex-1">
                          {subagent.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${getStatusBadgeClass(subagent.status)}`}>
                          {subagent.status}
                        </span>
                      </div>

                      <p className="text-xs text-[#a1a1a1] ml-4.5 mb-1.5 line-clamp-1" title={subagent.task}>
                        {subagent.task}
                      </p>

                      <div className="flex items-center gap-3 ml-4.5 text-[10px] text-[#525252]">
                        <span>Runtime: {subagent.runtime}</span>
                        <span>{getRelativeTime(subagent.startedAt)}</span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedSubagent === subagent.runId && (
                      <div className="px-3 pb-3 border-t border-[#27272a] pt-2 space-y-1">
                        <div className="text-[10px] text-[#525252]">
                          <span className="text-[#888888]">Run ID:</span> {subagent.runId}
                        </div>
                        <div className="text-[10px] text-[#525252]">
                          <span className="text-[#888888]">Tokens:</span> {subagent.totalTokens?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-[#525252]">
                          <span className="text-[#888888]">Started:</span> {new Date(subagent.startedAt).toLocaleString()}
                        </div>
                        {subagent.lastUpdated && (
                          <div className="text-[10px] text-[#525252]">
                            <span className="text-[#888888]">Updated:</span> {getRelativeTime(subagent.lastUpdated)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Subagents (Collapsed) */}
          {subagents.recent.length > 0 && (
            <div className="pt-3 border-t border-[#27272a]">
              <h3 className="text-[10px] font-medium text-[#525252] uppercase tracking-wide mb-2">
                Recent ({subagents.recent.length})
              </h3>
              <div className="space-y-1">
                {subagents.recent.slice(0, 3).map((subagent) => (
                  <div 
                    key={subagent.runId}
                    className="bg-[#0d0d0f] border border-[#27272a]/50 rounded-md p-2 opacity-60"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(subagent.status)}`}></div>
                      <span className="text-xs text-[#a1a1a1] truncate flex-1">
                        {subagent.label}
                      </span>
                      <span className="text-[10px] text-[#525252]">
                        {subagent.runtime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="p-3 border-t border-[#27272a] bg-[#151518] flex-shrink-0">
        <p className="text-[10px] text-[#525252] text-center">
          Updates every 10 seconds
        </p>
      </div>
    </div>
  );
}
