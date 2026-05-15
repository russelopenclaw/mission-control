'use client';

import React, { useState, useEffect } from 'react';

interface HealthCheck {
  name: string;
  path: string;
  status: number;
  ok: boolean;
  responseTime: number;
  error: string | null;
}

interface HealthData {
  healthy: boolean;
  checked: number;
  passed: number;
  failed: number;
  total: number;
  results: HealthCheck[];
  checkedAt: string;
}

export default function HealthStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
        <h3 className="text-sm font-semibold text-[#a1a1a1] mb-3">API Health</h3>
        <div className="text-[#71717a] text-sm">Checking endpoints...</div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="bg-[#151518] rounded-lg p-4 border border-red-900/50">
        <h3 className="text-sm font-semibold text-[#a1a1a1] mb-3">API Health</h3>
        <div className="text-red-400 text-sm">⚠️ Unable to check: {error}</div>
      </div>
    );
  }

  const getStatusColor = (ok: boolean) => ok ? 'text-green-400' : 'text-red-400';
  const getStatusIcon = (ok: boolean) => ok ? '✓' : '✗';
  const getTimeColor = (ms: number) => {
    if (ms < 0) return 'text-[#71717a]';
    if (ms < 500) return 'text-green-400';
    if (ms < 2000) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-[#151518] rounded-lg p-4 border border-[#27272a]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#a1a1a1]">API Health</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${health.healthy ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          {health.healthy ? 'All Healthy' : `${health.failed} Failed`}
        </span>
      </div>
      
      <div className="space-y-1.5">
        {health.results.map((check) => (
          <div key={check.path} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={getStatusColor(check.ok)}>{getStatusIcon(check.ok)}</span>
              <span className="text-[#e8e8e8]">{check.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={getTimeColor(check.responseTime)}>
                {check.responseTime >= 0 ? `${check.responseTime}ms` : '—'}
              </span>
              <span className="text-[#71717a]">{check.status}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-2 border-t border-[#27272a] text-xs text-[#71717a]">
        {health.passed}/{health.total} passed · Last checked: {new Date(health.checkedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}