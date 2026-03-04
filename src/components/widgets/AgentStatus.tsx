'use client';

import React, { useState, useEffect } from 'react';

interface AgentStatusData {
  status: 'working' | 'idle';
  currentTask?: string;
  lastActivity: string;
}

export default function AgentStatus() {
  const [agents, setAgents] = useState<{name: string; data: AgentStatusData}[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const agentList = Object.entries(data.agents || {}).map(([name, status]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          data: status as AgentStatusData
        }));
        setAgents(agentList);
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-[#22c55e]';
      case 'idle': return 'bg-[#eab308]';
      case 'offline': return 'bg-[#ef4444]';
      default: return 'bg-[#71717a]';
    }
  };

  return (
    <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
      <h2 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Agent Status</h2>
      <div className="space-y-2">
        {agents.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[#525252] text-sm">
            Loading agents...
          </div>
        ) : (
          agents.map((agent) => (
            <div key={agent.name} className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.data.status)}`}></div>
                <span className="font-medium text-[#e8e8e8] text-sm">{agent.name}</span>
                <span className="text-xs text-[#888888] capitalize">({agent.data.status})</span>
              </div>
              {agent.data.currentTask && (
                <p className="text-xs text-[#a1a1a1] ml-4">
                  <span className="text-[#525252]">Task:</span> {agent.data.currentTask}
                </p>
              )}
              {agent.data.lastActivity && (
                <p className="text-[10px] text-[#525252] ml-4 mt-0.5">
                  Last active: {new Date(agent.data.lastActivity).toLocaleString()}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
