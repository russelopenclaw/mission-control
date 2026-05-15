'use client';

import React, { useState, useEffect } from 'react';

interface HeatmapData {
  timestamp: string;
  agent: string;
  activityCount: number;
  workingCount: number;
  idleCount: number;
  doneCount: number;
  intensity: number;
}

interface AgentActivityHeatmapProps {
  period?: '24h' | '7days' | '30days' | '90days';
  granularity?: 'hourly' | 'daily';
}

export default function AgentActivityHeatmap({
  period = '7days',
  granularity = 'hourly',
}: AgentActivityHeatmapProps) {
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = new URL('/api/dashboard/heatmap', window.location.origin);
        url.searchParams.append('period', period);
        url.searchParams.append('granularity', granularity);

        const res = await fetch(url.toString());
        const result = await res.json();

        if (result.error) {
          setError(result.error);
        } else {
          setData(result.data || []);
        }
      } catch (err) {
        setError('Failed to load heatmap data');
        console.error('Heatmap fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [period, granularity]);

  // Generate time labels for X-axis
  const getXAxisLabels = () => {
    if (granularity === 'hourly') {
      // Show hour labels (0-23)
      return Array.from({ length: 24 }, (_, i) => i);
    } else {
      // Show day labels
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        return days[d.getDay()];
      });
    }
  };

  // Get unique agents
  const getAgents = () => {
    const agents = new Set(data.map(d => d.agent));
    return Array.from(agents);
  };

  // Get color for intensity level (0-5)
  const getIntensityColor = (intensity: number) => {
    const colors = [
      '#1e293b', // 0 - dark slate
      '#3b82f6', // 1 - blue
      '#06b6d4', // 2 - cyan
      '#10b981', // 3 - emerald
      '#f59e0b', // 4 - amber
      '#ef4444', // 5 - red
    ];
    return colors[Math.min(intensity, 5)];
  };

  // Get tooltip text
  const getTooltipText = (item: HeatmapData) => {
    const date = new Date(item.timestamp);
    const timeLabel = granularity === 'hourly'
      ? date.toLocaleTimeString('en-US', { hour: '2-digit' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <strong>${item.agent}</strong><br/>
      ${timeLabel}<br/>
      Total Activity: ${item.activityCount}<br/>
      Working: ${item.workingCount} | Idle: ${item.idleCount} | Done: ${item.doneCount}
    `;
  };

  if (loading) {
    return (
      <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">
          Agent Activity Heatmap
        </h3>
        <div className="flex items-center justify-center h-64 text-[#525252]">
          Loading heatmap data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">
          Agent Activity Heatmap
        </h3>
        <div className="text-red-400 text-sm p-3 bg-[#450a0a]/20 rounded">
          {error}
        </div>
      </div>
    );
  }

  const agents = getAgents();
  const xLabels = getXAxisLabels();

  return (
    <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#888888] uppercase tracking-wide">
          Agent Activity Heatmap
        </h3>
        <div className="flex items-center gap-2 text-xs text-[#525252]">
          <span className="px-2 py-1 bg-[#1e293b] rounded">Intensity Scale</span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getIntensityColor(level) }}
                title={`Intensity ${level}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Simple Heatmap Visualization */}
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between py-4 text-xs text-[#525252]">
              {agents.map((agent) => (
                <span key={agent}>{agent}</span>
              ))}
            </div>

            {/* Heatmap cells */}
            {agents.map((agent, agentIndex) => (
              <React.Fragment key={agent}>
                {xLabels.map((label) => {
                  // Find data for this cell
                  const cellData = data.find(
                    (d) =>
                      d.agent === agent &&
                      (granularity === 'hourly'
                        ? new Date(d.timestamp).getHours() === label
                        : d.agent === agent)
                  );

                  const intensity = cellData?.intensity || 0;

                  return (
                    <div
                      key={`${agent}-${label}`}
                      className="w-4 h-12 rounded cursor-pointer transition-all hover:scale-110"
                      style={{
                        backgroundColor: getIntensityColor(intensity),
                        opacity: intensity === 0 ? 0.3 : 0.8,
                      }}
                      title={getTooltipText(cellData || {
                        timestamp: new Date().toISOString(),
                        agent,
                        activityCount: 0,
                        workingCount: 0,
                        idleCount: 0,
                        doneCount: 0,
                        intensity: 0,
                      })}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-[10px] text-[#525252]">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-[#27272a]">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[#525252]">Peak Activity:</span>
            <span className="ml-1 text-[#e8e8e8]">
              {agents.length > 0
                ? `${agents[0]} (${Math.max(...data.map(d => d.activityCount))} events)`
                : '-'}
            </span>
          </div>
          <div>
            <span className="text-[#525252]">Current Status:</span>
            <span className="ml-1">
              {agents.some(a => data.some(d => d.agent === a && d.workingCount > 0))
                ? '🟢 Active'
                : '🟡 Idle'}
            </span>
          </div>
          <div>
            <span className="text-[#525252]">Period:</span>
            <span className="ml-1 text-[#22c55e]">{period}</span>
          </div>
          <div>
            <span className="text-[#525252]">Granularity:</span>
            <span className="ml-1 text-[#22c55e]">{granularity}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
