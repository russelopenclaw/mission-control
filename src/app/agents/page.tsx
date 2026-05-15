'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

interface Agent {
  name: string;
  role: string;
  tier: number;
  model: string;
  status: 'working' | 'idle' | 'offline';
  currentTask?: string;
  lastActivity: string;
  description: string;
  skills: string[];
}

const AGENT_HIERARCHY: Agent[] = [
  // TIER 1 - Permanent Orchestrators
  {
    name: 'Alfred',
    role: 'Master Orchestrator',
    tier: 1,
    model: 'qwen3.5:cloud (397B)',
    status: 'idle',
    currentTask: 'Documentation consolidation',
    lastActivity: new Date().toISOString(),
    description: 'Kevin\'s primary assistant - strategy, planning, coordination',
    skills: ['Reasoning', 'Planning', 'Orchestration', 'Validation']
  },
  {
    name: 'Jeeves',
    role: 'Deep Analysis Specialist',
    tier: 1,
    model: 'deepseek-v3.1:671b-cloud',
    status: 'idle',
    currentTask: 'All tasks complete',
    lastActivity: '2026-03-06T09:59:13Z',
    description: 'Complex analysis, research, massive document review',
    skills: ['Deep Analysis', 'Research', 'Document Review']
  },
  
  // TIER 3 - Ephemeral Executors (spawned per task)
  {
    name: 'CodingAgent',
    role: 'Software Development',
    tier: 3,
    model: 'qwen2.5-coder:7b (local)',
    status: 'offline',
    lastActivity: 'Per-task spawn',
    description: 'Code generation, API integration, debugging, refactors',
    skills: ['Coding', 'Debugging', 'APIs', 'Git']
  },
  {
    name: 'ResearchAgent',
    role: 'Information Gathering',
    tier: 3,
    model: 'llama3.1:8b (local)',
    status: 'offline',
    lastActivity: 'Per-task spawn',
    description: 'Web search, analysis, documentation review',
    skills: ['Research', 'Analysis', 'Web Search']
  },
  {
    name: 'WritingAgent',
    role: 'Content Creation',
    tier: 3,
    model: 'qwen2.5:7b (local)',
    status: 'offline',
    lastActivity: 'Per-task spawn',
    description: 'Technical writing, documentation, copy',
    skills: ['Writing', 'Documentation', 'Content']
  },
  {
    name: 'ImageAgent',
    role: 'Visual Content',
    tier: 3,
    model: 'qwen2.5:7b + SD WebUI',
    status: 'offline',
    lastActivity: 'Per-task spawn',
    description: 'Stable Diffusion prompts, image generation',
    skills: ['Image Gen', 'Prompts', 'SD']
  },
  {
    name: 'DadJokePipeline',
    role: 'Daily Video Automation',
    tier: 3,
    model: 'auto-dadj-runner.js',
    status: 'idle',
    currentTask: 'Ready for 6 AM run (T-102)',
    lastActivity: 'Daily 6 AM',
    description: 'ElevenLabs TTS → SD background → Remotion → MinIO',
    skills: ['Video', 'TTS', 'Remotion', 'Automation']
  },
  {
    name: 'ValidationAgent',
    role: 'Quality Assurance',
    tier: 3,
    model: 'Alfred (always)',
    status: 'idle',
    lastActivity: 'Per-task validation',
    description: 'Deliverable verification, acceptance criteria checks',
    skills: ['QA', 'Validation', 'Checklist']
  }
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Load live status from API
    fetch('/api/status')
      .then(res => res.json())
      .then((data: any) => {
        const agentsData = data.agents || {};
        setLiveStatus(agentsData);
        const enhanced = AGENT_HIERARCHY.map(agent => {
          const live = agentsData[agent.name.toLowerCase()] || agentsData[agent.name.toLowerCase().replace('agent', '')];
          if (live && typeof live === 'object') {
            return {
              ...agent,
              status: (live as any).status || agent.status,
              currentTask: (live as any).currentTask || agent.currentTask,
              lastActivity: (live as any).lastActivity || agent.lastActivity
            };
          }
          return agent;
        });
        setAgents(enhanced);
        setLoading(false);
      })
      .catch(() => {
        setAgents(AGENT_HIERARCHY);
        setLoading(false);
      });
    
    // Poll every 10s for live updates
    const interval = setInterval(() => {
      fetch('/api/status')
        .then(res => res.json())
        .then((data: any) => {
          const agentsData = data.agents || {};
          setLiveStatus(agentsData);
        });
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-[#22c55e] text-white';
      case 'idle': return 'bg-[#eab308] text-black';
      case 'offline': return 'bg-[#71717a] text-white';
      default: return 'bg-[#525252] text-white';
    }
  };

  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-[#1e3a8a] text-[#93c5fd]'; // Blue - Orchestrators
      case 2: return 'bg-[#422006] text-[#fde68a]'; // Yellow - Specialists
      case 3: return 'bg-[#27272a] text-[#a1a1a1]'; // Gray - Executors
      default: return 'bg-[#525252]';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp || timestamp === 'Per-task spawn' || timestamp === 'Daily 6 AM') return timestamp;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-gray-400 hover:text-white">← Dashboard</Link>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Agents</h1>
          <p className="text-gray-400">Organizational hierarchy and live status</p>
        </div>

        {/* Legend */}
        <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Tier Legend</h2>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded ${getTierBadge(1)}`}>Tier 1</span>
              <span className="text-gray-400">Permanent Orchestrators</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded ${getTierBadge(2)}`}>Tier 2</span>
              <span className="text-gray-400">Deep Analysis Specialists</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded ${getTierBadge(3)}`}>Tier 3</span>
              <span className="text-gray-400">Ephemeral Executors (spawned per task)</span>
            </div>
          </div>
        </div>

        {/* Hierarchy Chart */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Agent Hierarchy</h2>
          <div className="bg-[#151518] border border-[#27272a] rounded-lg p-6 overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Tier 1 */}
              <div className="mb-6">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Tier 1 - Permanent Orchestrators (Reasoning ON)
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {agents.filter(a => a.tier === 1).map((agent, idx) => (
                    <div 
                      key={agent.name}
                      className={`bg-[#0d0d0f] border ${liveStatus[agent.name.toLowerCase()] ? 'border-[#22c55e]/50' : 'border-[#27272a]'} rounded-lg p-5`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusColor(agent.status).split(' ')[0]}`}></div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                            <p className="text-xs text-gray-400">{agent.role}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${getTierBadge(agent.tier)}`}>
                          Tier {agent.tier}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Model:</span>
                          <span className="text-gray-300">{agent.model}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Status:</span>
                          <span className={`${getStatusColor(agent.status)} text-xs px-2 py-0.5 rounded`}>
                            {agent.status}
                          </span>
                        </div>
                        {agent.currentTask && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-gray-500 mt-0.5">Task:</span>
                            <span className="text-gray-300 text-xs flex-1">{agent.currentTask}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Last:</span>
                          <span className="text-gray-400 text-xs">{formatTimeAgo(agent.lastActivity)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-[#27272a]">
                        <p className="text-xs text-gray-400 mb-2">{agent.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {agent.skills.map((skill, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#27272a] text-gray-300 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier 3 */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Tier 3 - Ephemeral Executors (spawned per task, destroyed on completion)
                </h3>
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {agents.filter(a => a.tier === 3).map((agent, idx) => (
                    <div 
                      key={agent.name}
                      className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-4 hover:border-[#3f3f46] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status).split(' ')[0]}`}></div>
                        <h4 className="text-sm font-medium text-white">{agent.name}</h4>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{agent.role}</p>
                      <div className="text-[10px] text-gray-500 mb-2">{agent.model}</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.skills.map((skill, i) => (
                          <span key={i} className="text-[9px] px-1 py-0.5 bg-[#27272a]/50 text-gray-400 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-[#151518] border border-[#27272a] rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Architecture Notes</h2>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-500">→</span>
              <span><strong>2 permanent agents</strong> (Alfred + Jeeves) - persistent identities in PostgreSQL <code>agents</code> table</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">→</span>
              <span><strong>16 sub-agent runs</strong> (ephemeral) - spawned for tasks, destroyed on completion</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500">→</span>
              <span><strong>Alfred handles 89%</strong> of tasks directly - specializes in orchestration, not execution</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">→</span>
              <span><strong>Model matching</strong> - small local (7-8B) for simple tasks, cloud (397B+) for complex work</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
