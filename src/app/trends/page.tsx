'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface TrendItem {
  source: 'google' | 'x';
  title: string;
  traffic?: string;
  rank?: number;
  pubDate?: string;
  picture?: string;
  pictureSource?: string;
  newsItems?: {
    title: string;
    url: string;
    source: string;
    picture?: string;
  }[];
}

interface IdeaSuggestion {
  trend: string;
  source: 'google' | 'x';
  traffic?: string;
  ideas: {
    name: string;
    description: string;
    type: 'app' | 'website' | 'tool' | 'content';
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
}

const GEO_LABELS: Record<string, string> = {
  US: '🇺🇸 United States',
  GB: '🇬🇧 United Kingdom',
  CA: '🇨🇦 Canada',
  AU: '🇦🇺 Australia',
  DE: '🇩🇪 Germany',
  FR: '🇫🇷 France',
  JP: '🇯🇵 Japan',
  BR: '🇧🇷 Brazil',
  IN: '🇮🇳 India',
  KR: '🇰🇷 South Korea',
};

const TYPE_COLORS: Record<string, string> = {
  app: 'bg-[#3b82f6]/20 text-[#93c5fd] border-[#3b82f6]/30',
  website: 'bg-[#22c55e]/20 text-[#86efac] border-[#22c55e]/30',
  tool: 'bg-[#a855f7]/20 text-[#d8b4fe] border-[#a855f7]/30',
  content: 'bg-[#f59e0b]/20 text-[#fde68a] border-[#f59e0b]/30',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
};

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [ideas, setIdeas] = useState<IdeaSuggestion[]>([]);
  const [geo, setGeo] = useState('US');
  const [mode, setMode] = useState<'trends' | 'ideas'>('trends');
  const [loading, setLoading] = useState(true);
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null);
  const [expandedIdea, setExpandedIdea] = useState<number | null>(null);
  const [counts, setCounts] = useState({ google: 0, x: 0, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/trends?geo=${geo}&mode=${mode}`);
        const data = await res.json();
        if (mode === 'trends') {
          setTrends(data.trends || []);
          setCounts(data.counts || { google: 0, x: 0, total: 0 });
        } else {
          setIdeas(data.suggestions || []);
          setCounts(data.counts || { google: 0, x: 0, total: 0 });
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [geo, mode]);

  const [exporting, setExporting] = useState<string | null>(null);

  async function exportIdea(ideaName: string, description: string, difficulty: string, trendTitle: string) {
    setExporting(ideaName);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ideaName,
          description: `${description}\n\nInspired by: ${trendTitle}`,
          column: 'backlog',
          priority: difficulty === 'easy' ? 'low' : difficulty === 'medium' ? 'medium' : 'high',
          assignee: 'alfred',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert(`"${ideaName}" added to backlog!`);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to export idea');
    } finally {
      setExporting(null);
    }
  }

  const getSourceBadge = (source: 'google' | 'x') => {
    if (source === 'google') {
      return <span className="text-[10px] px-2 py-0.5 rounded bg-[#4285f4]/20 text-[#93c5fd] border border-[#4285f4]/30">Google</span>;
    }
    return <span className="text-[10px] px-2 py-0.5 rounded bg-[#1da1f2]/20 text-[#93c5fd] border border-[#1da1f2]/30">𝕏</span>;
  };

  return (
    <DashboardLayout>
      <div className="relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {mode === 'trends' ? '🔥 Trending Now' : '💡 Trend Ideas'}
            </h1>
            <p className="text-xs text-[#888888] mt-1">
              {mode === 'trends' 
                ? `Google (${counts.google}) + X (${counts.x}) trends for US`
                : 'Project ideas inspired by what\'s trending'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              className="bg-[#151518] border border-[#27272a] text-sm text-[#e8e8e8] rounded-md px-3 py-2 focus:outline-none focus:border-[#5e6ad2]"
            >
              {Object.entries(GEO_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
            <div className="flex bg-[#151518] border border-[#27272a] rounded-md overflow-hidden">
              <button
                onClick={() => setMode('trends')}
                className={`text-sm px-3 py-2 transition-colors ${
                  mode === 'trends' ? 'bg-[#5e6ad2] text-white' : 'text-[#888888] hover:text-white'
                }`}
              >
                Trends
              </button>
              <button
                onClick={() => setMode('ideas')}
                className={`text-sm px-3 py-2 transition-colors ${
                  mode === 'ideas' ? 'bg-[#5e6ad2] text-white' : 'text-[#888888] hover:text-white'
                }`}
              >
                Ideas
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-[#888888]">Loading trends...</span>
          </div>
        ) : mode === 'trends' ? (
          /* Trends View */
          <div className="space-y-3">
            {trends.map((trend, i) => (
              <div
                key={i}
                className="bg-[#151518] border border-[#27272a] rounded-lg overflow-hidden hover:border-[#3f3f46] transition-colors"
              >
                <button
                  onClick={() => setExpandedTrend(expandedTrend === i ? null : i)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  {trend.picture && (
                    <img
                      src={trend.picture}
                      alt=""
                      className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getSourceBadge(trend.source)}
                      <h3 className="text-sm font-semibold text-white truncate">{trend.title}</h3>
                      {trend.traffic && (
                        <span className="text-xs text-[#5e6ad2] font-mono flex-shrink-0">{trend.traffic}</span>
                      )}
                      {trend.rank && (
                        <span className="text-xs text-[#1da1f2] font-mono flex-shrink-0">#{trend.rank}</span>
                      )}
                    </div>
                    {trend.newsItems && trend.newsItems.length > 0 && (
                      <p className="text-xs text-[#888888] truncate">
                        {trend.newsItems[0].title}
                      </p>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-[#888888] transition-transform flex-shrink-0 ${expandedTrend === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedTrend === i && trend.newsItems && trend.newsItems.length > 0 && (
                  <div className="px-4 pb-4 space-y-2">
                    <div className="border-t border-[#27272a] pt-3">
                      <h4 className="text-xs text-[#888888] uppercase tracking-wide mb-2">Related News</h4>
                      {trend.newsItems.map((news, j) => (
                        <a
                          key={j}
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 rounded-md hover:bg-[#1a1a1f] transition-colors"
                        >
                          <div className="text-xs text-[#e8e8e8] font-medium">{news.title}</div>
                          <div className="text-[10px] text-[#525252] mt-0.5">{news.source}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Ideas View */
          <div className="space-y-4">
            {ideas.map((idea, i) => (
              <div
                key={i}
                className="bg-[#151518] border border-[#27272a] rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedIdea(expandedIdea === i ? null : i)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getSourceBadge(idea.source)}
                      <h3 className="text-sm font-semibold text-white">{idea.trend}</h3>
                      {idea.traffic && (
                        <span className="text-xs text-[#5e6ad2] font-mono">{idea.traffic}</span>
                      )}
                    </div>
                    <p className="text-xs text-[#888888] mt-0.5">
                      {idea.ideas.length} project ideas
                    </p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-[#888888] transition-transform flex-shrink-0 ${expandedIdea === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedIdea === i && (
                  <div className="px-4 pb-4 space-y-2">
                    {idea.ideas.map((item, j) => (
                      <div key={j} className="bg-[#0d0d0f] border border-[#27272a] rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${TYPE_COLORS[item.type]}`}>
                            {item.type}
                          </span>
                          <span className={`text-[10px] ${DIFFICULTY_COLORS[item.difficulty]}`}>
                            {item.difficulty}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-[#e8e8e8]">{item.name}</h4>
                        <p className="text-xs text-[#a1a1a1] mt-1">{item.description}</p>
                        <button
                          onClick={() => exportIdea(item.name, item.description, item.difficulty, idea.trend)}
                          disabled={exporting === item.name}
                          className="mt-2 text-[10px] px-2 py-1 rounded bg-[#5e6ad2] hover:bg-[#6d79e0] text-white transition-colors disabled:opacity-50"
                        >
                          {exporting === item.name ? 'Adding...' : '→ Add to Backlog'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {(!loading && trends.length === 0 && ideas.length === 0) && (
          <div className="text-center py-20">
            <p className="text-[#888888]">No trends found for this region</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}