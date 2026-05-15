import { NextResponse } from 'next/server';

const MC_URL = 'http://localhost:8765';

const ENDPOINTS = [
  { path: '/api/status', expected: [200], name: 'Agent Status' },
  { path: '/api/tasks', expected: [200], name: 'Tasks' },
  { path: '/api/events', expected: [200], name: 'Events' },
  { path: '/api/plex/activity', expected: [200], name: 'Plex Activity' },
  { path: '/api/calendar/events', expected: [200], name: 'Calendar' },
  { path: '/api/activity/status', expected: [200], name: 'Activity Status' },
  { path: '/', expected: [200, 307], name: 'Home Page' },
];

export async function GET() {
  const results = await Promise.all(
    ENDPOINTS.map(async (endpoint) => {
      try {
        const start = Date.now();
        const res = await fetch(`${MC_URL}${endpoint.path}`, {
          signal: AbortSignal.timeout(10000),
          redirect: 'manual',
        });
        const responseTime = Date.now() - start;
        const status = res.status;
        const ok = endpoint.expected.includes(status);
        return { name: endpoint.name, path: endpoint.path, status, ok, responseTime, error: null };
      } catch (err) {
        return {
          name: endpoint.name,
          path: endpoint.path,
          status: 0,
          ok: false,
          responseTime: -1,
          error: err instanceof Error ? err.message.slice(0, 80) : 'Unknown error',
        };
      }
    })
  );

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    healthy: failed.length === 0,
    checked: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    total: results.length,
    results,
    checkedAt: new Date().toISOString(),
  });
}