'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface WeatherData {
  tempC: string;
  tempF: string;
  condition: string;
  icon: string;
  humidity: string;
  wind: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'personal' | 'meeting' | 'reminder' | 'cron';
  startTime?: string;
  description?: string;
}

interface AgentStatus {
  name: string;
  status: 'working' | 'idle';
  currentTask?: string;
}

interface BriefingData {
  weather: WeatherData | null;
  calendar: CalendarEvent[];
  overdue: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate: string;
  }>;
  recentPlex: {
    count: number;
    watches: Array<{
      title: string;
      show?: string;
      type: string;
      viewedAt: number;
      username: string;
    }>;
  } | null;
  agentStatus: AgentStatus[];
  tasksInProgress: number;
  fetchedAt: string;
}

function relativeTime(dateStr: string | number): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MorningBriefing() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/briefing');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('[MorningBriefing] Failed to fetch:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-[#22c55e] text-white';
      case 'idle': return 'bg-[#3b82f6] text-white';
      default: return 'bg-[#71717a] text-white';
    }
  };

  const getStatusPill = (agent: AgentStatus) => {
    const isWorking = agent.status === 'working';
    return (
      <div key={agent.name} className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0d0f] rounded-full border border-[#27272a]">
        <div className={`w-2 h-2 rounded-full ${isWorking ? 'bg-[#22c55e]' : 'bg-[#3b82f6]'}`}></div>
        <span className={`text-xs font-medium ${isWorking ? 'text-[#22c55e]' : 'text-[#3b82f6]'}`}>
          {agent.name}
        </span>
        <span className="text-[10px] text-[#71717a] capitalize">({agent.status})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-[#151518] rounded-lg border border-[#27272a] p-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 bg-[#27272a] rounded w-1/3" />
            <div className="h-12 bg-[#27272a] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-[#151518] rounded-lg border border-[#ef4444] p-6">
        <p className="text-[#ef4444] text-sm">Failed to load briefing: {error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-[#27272a] text-[#e8e8e8] rounded-lg hover:bg-[#3b3b3e] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#151518] rounded-lg border border-[#27272a] p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#e8e8e8]">☀️ Morning Briefing</h2>
        <span className="text-xs text-[#71717a]">
          {data?.fetchedAt ? `Updated ${relativeTime(data.fetchedAt)}` : 'Loading...'}
        </span>
      </div>

      <div className="space-y-6">
        {/* Weather Section */}
        <section className="bg-[#0d0d0f] rounded-lg p-4 border border-[#27272a]">
          <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">Weather</h3>
          {data?.weather ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-4xl sm:text-5xl">
                {data.weather.condition.toLowerCase().includes('sun') ? '☀️' : 
                 data.weather.condition.toLowerCase().includes('cloud') ? '☁️' : 
                 data.weather.condition.toLowerCase().includes('rain') ? '🌧️' : '🌤️'}
              </div>
              <div className="text-center sm:text-left">
                <div className="text-4xl sm:text-5xl font-bold text-[#e8e8e8]">
                  {data.weather.tempC}°C / {data.weather.tempF}°F
                </div>
                <div className="text-[#a1a1a1] text-lg">{data.weather.condition}</div>
                <div className="text-xs text-[#71717a] mt-1">
                  Humidity: {data.weather.humidity}% • Wind: {data.weather.wind}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[#71717a] text-sm py-4">
              Weather data unavailable
            </div>
          )}
        </section>

        {/* Today's Calendar */}
        <section className="bg-[#0d0d0f] rounded-lg p-4 border border-[#27272a]">
          <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">📅 Today's Schedule</h3>
          {data?.calendar && data.calendar.length > 0 ? (
            <div className="space-y-3">
              {data.calendar.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#1a1a1f] transition-colors">
                  <div className={`w-1.5 h-8 rounded-full mt-0.5 flex-shrink-0 ${
                    event.type === 'meeting' ? 'bg-[#3b82f6]' :
                    event.type === 'reminder' ? 'bg-[#f97316]' :
                    event.type === 'cron' ? 'bg-[#a855f7]' : 'bg-[#22c55e]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-[#e8e8e8] truncate">{event.title}</h4>
                      {event.startTime && (
                        <span className="text-xs text-[#71717a]">{event.startTime}</span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-[#a1a1a1] mt-1">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#71717a] text-sm py-4 text-center">
              Nothing scheduled for today
            </div>
          )}
        </section>

        {/* Overdue Reminders */}
        <section className="bg-[#0d0d0f] rounded-lg p-4 border border-[#27272a]">
          <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">🔔 Overdue Reminders</h3>
          {data?.overdue && data.overdue.length > 0 ? (
            <>
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#ef4444]/10 text-[#ef4444] text-xs font-medium">
                  {data.overdue.length} overdue
                </span>
              </div>
              <div className="space-y-2">
                {data.overdue.slice(0, 5).map((reminder) => (
                  <div key={reminder.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1f]/50 border border-[#ef4444]/20">
                    <div className="w-2 h-2 rounded-full bg-[#ef4444] mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-[#e8e8e8]">{reminder.title}</h4>
                      {reminder.description && (
                        <p className="text-xs text-[#a1a1a1] mt-1 line-clamp-2">{reminder.description}</p>
                      )}
                      <span className="text-[10px] text-[#ef4444] mt-1 block">Due: {reminder.dueDate}</span>
                    </div>
                  </div>
                ))}
                {data.overdue.length > 5 && (
                  <p className="text-xs text-[#71717a] text-center mt-2">
                    {data.overdue.length - 5} more... (showing first 5)
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-[#22c55e] text-sm py-4 text-center">
              All caught up! No overdue reminders 🎉
            </div>
          )}
        </section>

        {/* Plex Activity */}
        <section className="bg-[#0d0d0f] rounded-lg p-4 border border-[#27272a]">
          <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">🎬 Overnight Activity</h3>
          {data?.recentPlex && data.recentPlex.count > 0 ? (
            <>
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-medium">
                  {data.recentPlex.count} new watches
                </span>
              </div>
              <div className="space-y-2">
                {data.recentPlex.watches.map((watch, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#1a1a1f] transition-colors">
                    <span className="text-xs text-[#71717a] w-12 flex-shrink-0 text-right">
                      {watch.type === 'episode' ? 'Ep' : 'Movie'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#e8e8e8] truncate">{watch.title}</p>
                      {watch.show && (
                        <p className="text-xs text-[#a1a1a1] truncate">{watch.show}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-[#52525b] flex-shrink-0 whitespace-nowrap">
                      {watch.viewedAt ? relativeTime(watch.viewedAt * 1000) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[#71717a] text-sm py-4 text-center">
              No overnight activity
            </div>
          )}
        </section>

        {/* Agent Status */}
        <section className="bg-[#0d0d0f] rounded-lg p-4 border border-[#27272a]">
          <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">🤖 Agents</h3>
          {data?.agentStatus && data.agentStatus.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.agentStatus.map(agent => getStatusPill(agent))}
            </div>
          ) : (
            <div className="text-[#71717a] text-sm py-4 text-center">
              Agent status unavailable
            </div>
          )}
        </section>

        {/* Tasks in Progress */}
        <section className="bg-[#0d0d0f] rounded-lg p-4 border border-[#27272a]">
          <h3 className="text-sm font-medium text-[#888888] mb-3 uppercase tracking-wide">📋 Tasks in Progress</h3>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-[#e8e8e8]">
              {data?.tasksInProgress ?? 0}
            </span>
            <Link 
              href="/tasks"
              className="text-sm text-[#3b82f6] hover:text-[#60a5fa] px-4 py-2 rounded-lg hover:bg-[#3b82f6]/10 transition-colors"
            >
              View All Tasks →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
