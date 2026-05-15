'use client';

import React, { useState, useEffect } from 'react';

interface TaskVelocityData {
  period: string;
  granularity: string;
  summary: {
    totalCompleted: number;
    avgDailyTasks: number;
    velocityTrend: number;
    currentPeriod: number;
    previousPeriod: number;
    last7Days: Array<{
      date: string;
      dayName: string;
      taskCount: number;
      assignees: string[];
      avgCompletionTimeSeconds: number | null;
    }>;
  };
  chartData: Array<{
    date: string;
    dayName: string;
    taskCount: number;
  }>;
  weeklyData: any[];
}

interface TaskVelocityTrackerProps {
  period?: '7days' | '30days' | '90days';
  granularity?: 'daily' | 'weekly';
}

export default function TaskVelocityTracker({
  period = '7days',
  granularity = 'daily',
}: TaskVelocityTrackerProps) {
  const [data, setData] = useState<TaskVelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = new URL('/api/dashboard/velocity', window.location.origin);
        url.searchParams.append('period', period);
        url.searchParams.append('granularity', granularity);

        const res = await fetch(url.toString());
        const result = await res.json();

        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (err) {
        setError('Failed to load velocity data');
        console.error('Velocity fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [period, granularity]);

  // Trend indicator
  const TrendIndicator = ({ trend }: { trend: number }) => {
    const isPositive = trend > 0;
    const isNeutral = trend === 0;
    const colorClass = isPositive
      ? 'text-[#22c55e]'
      : isNeutral
      ? 'text-[#71717a]'
      : 'text-[#ef4444]';

    const icon = isPositive ? '↑' : isNeutral ? '→' : '↓';
    const absTrend = Math.abs(trend);

    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <span>{icon}</span>
        <span>{absTrend}%</span>
      </div>
    );
  };

  // Bar chart height calculation
  const getMaxTasks = () => {
    if (!data) return 1;
    const max = Math.max(...data.chartData.map(d => d.taskCount), 1);
    return Math.ceil(max * 1.2); // 20% padding
  };

  if (loading) {
    return (
      <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">
          Task Velocity Tracker
        </h3>
        <div className="flex items-center justify-center h-48 text-[#525252]">
          Loading velocity data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">
          Task Velocity Tracker
        </h3>
        <div className="text-red-400 text-sm p-3 bg-[#450a0a]/20 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">
          Task Velocity Tracker
        </h3>
        <div className="text-red-400 text-sm p-3 bg-[#450a0a]/20 rounded">
          {error || 'No data available'}
        </div>
      </div>
    );
  }

  const { summary, chartData } = data;
  const maxTasks = getMaxTasks();

  return (
    <div className="bg-[#0d0d0f] border border-[#27272a] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#888888] uppercase tracking-wide">
          Task Velocity Tracker
        </h3>
        <div className="flex items-center gap-2 text-xs text-[#525252]">
          <span className="px-2 py-1 bg-[#1e293b] rounded">
            {period}
          </span>
          <span className="px-2 py-1 bg-[#1e293b] rounded">
            {granularity}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-[#0a0a0b] border border-[#27272a] rounded p-3">
          <div className="text-xs text-[#525252] mb-1">Total Completed</div>
          <div className="text-2xl font-bold text-[#e8e8e8]">
            {summary.totalCompleted}
          </div>
        </div>

        <div className="bg-[#0a0a0b] border border-[#27272a] rounded p-3">
          <div className="text-xs text-[#525252] mb-1">Avg Daily Tasks</div>
          <div className="text-2xl font-bold text-[#e8e8e8]">
            {summary.avgDailyTasks}
          </div>
        </div>

        <div className="bg-[#0a0a0b] border border-[#27272a] rounded p-3">
          <div className="text-xs text-[#525252] mb-1">Velocity Trend</div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#e8e8e8]">
              <TrendIndicator trend={summary.velocityTrend} />
            </span>
          </div>
        </div>

        <div className="bg-[#0a0a0b] border border-[#27272a] rounded p-3">
          <div className="text-xs text-[#525252] mb-1">Current Period</div>
          <div className="text-2xl font-bold text-[#e8e8e8]">
            {summary.currentPeriod}
            <span className="text-xs text-[#525252] ml-1">
              tasks
            </span>
          </div>
        </div>
      </div>

      {/* Task Completion Chart */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-[#71717a] mb-2">
          Task Completion Trend
        </h4>
        <div className="flex items-end h-32 gap-1">
          {chartData.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full flex items-end gap-0.5">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-[#1e293b] text-[#e8e8e8] text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                    {day.date}: {day.taskCount} task{day.taskCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t hover:opacity-80 transition-all ${
                    day.taskCount === 0
                      ? 'bg-[#374151]'
                      : day.taskCount >= 5
                      ? 'bg-[#22c55e]'
                      : 'bg-[#3b82f6]'
                  }`}
                  style={{
                    height: `${Math.max((day.taskCount / maxTasks) * 100, 4)}%`,
                  }}
                  title={`${day.date}: ${day.taskCount} tasks`}
                />
              </div>
              <span className="text-[10px] text-[#525252] mt-1 truncate w-full text-center">
                {day.dayName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Last 7 Days Details */}
      <div className="pt-3 border-t border-[#27272a]">
        <h4 className="text-xs font-medium text-[#71717a] mb-2">
          Last 7 Days Details
        </h4>
        <div className="space-y-1">
          {summary.last7Days.slice(-7).map((day, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs p-2 bg-[#0a0a0b] border border-[#27272a] rounded"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#525252] w-12">{day.dayName}</span>
                <span className="text-[#e8e8e8]">{day.date}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="font-bold text-[#e8e8e8]">{day.taskCount}</div>
                  <div className="text-[10px] text-[#525252]">tasks</div>
                </div>

                {day.avgCompletionTimeSeconds !== null && (
                  <div className="text-center">
                    <div className="font-bold text-[#3b82f6]">
                      {Math.round(day.avgCompletionTimeSeconds / 60)}m
                    </div>
                    <div className="text-[10px] text-[#525252]">avg</div>
                  </div>
                )}

                {day.assignees.length > 0 && (
                  <div className="flex gap-1">
                    {day.assignees.slice(0, 3).map((assignee, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-[#6366f1]"
                        title={assignee}
                      />
                    ))}
                    {day.assignees.length > 3 && (
                      <span className="text-[10px] text-[#525252]">
                        +{day.assignees.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
