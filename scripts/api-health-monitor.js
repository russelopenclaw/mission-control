#!/usr/bin/env node
/**
 * MC API Health Monitor
 * 
 * Periodically checks critical API endpoints and logs failures.
 * Reports health status to PostgreSQL for dashboard visibility.
 * 
 * Usage: node api-health-monitor.js [--once|--daemon]
 */

const { execSync } = require('child_process');

const MC_URL = 'http://localhost:8765';
const PSQL = 'PGPASSWORD=AlfredDB2026Secure psql -h localhost -U alfred -d mission_control -t -c';

const ENDPOINTS = [
  { path: '/', expected: [200, 307], name: 'Home page', auth: false },
  { path: '/api/status', expected: [200, 307], name: 'Agent Status API', auth: false },
  { path: '/api/tasks', expected: [200, 307], name: 'Tasks API', auth: false },
  { path: '/api/events', expected: [200, 307], name: 'Events API', auth: false },
  { path: '/api/plex/activity', expected: [200], name: 'Plex Activity API', auth: false },
  { path: '/api/calendar/events', expected: [200], name: 'Calendar Events API', auth: false },
  { path: '/api/activity/status', expected: [200], name: 'Activity Status API', auth: false },
];

let authCookie = null;

function getAuthCookie() {
  try {
    const result = execSync(
      `curl -s -c - -X POST "${MC_URL}/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"wolfencj","password":"203Rocky!"}' 2>/dev/null`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const match = result.match(/session=\w+/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

function checkEndpoint(endpoint) {
  try {
    const cookieFlag = (endpoint.auth && authCookie) ? `-b "${authCookie}"` : '';
    const cmd = `curl -s -o /dev/null -w "%{http_code}" ${cookieFlag} --max-time 10 "${MC_URL}${endpoint.path}" 2>/dev/null`;
    const code = execSync(cmd, { encoding: 'utf-8', timeout: 15000 }).trim();
    
    const status = parseInt(code);
    const ok = endpoint.expected.includes(status);
    const responseTime = getResponseTime(endpoint.path);
    
    return { 
      name: endpoint.name, 
      path: endpoint.path, 
      status, 
      ok, 
      responseTime,
      error: ok ? null : `Expected ${endpoint.expected}, got ${status}`
    };
  } catch (err) {
    return { 
      name: endpoint.name, 
      path: endpoint.path, 
      status: 0, 
      ok: false, 
      responseTime: -1,
      error: err.message.slice(0, 100)
    };
  }
}

function getResponseTime(path) {
  try {
    const cmd = `curl -s -o /dev/null -w "%{time_total}" --max-time 10 "${MC_URL}${path}" 2>/dev/null`;
    const time = execSync(cmd, { encoding: 'utf-8', timeout: 15000 }).trim();
    return Math.round(parseFloat(time) * 1000);
  } catch {
    return -1;
  }
}

async function runCheck() {
  // Refresh auth cookie
  authCookie = getAuthCookie();
  
  const results = ENDPOINTS.map(checkEndpoint);
  const failed = results.filter(r => !r.ok);
  const passed = results.filter(r => r.ok);
  
  // Build status
  const healthy = failed.length === 0;
  const slowEndpoints = results.filter(r => r.responseTime > 3000);
  
  // Store results in PostgreSQL
  const statusJson = JSON.stringify({
    healthy,
    checked: results.length,
    passed: passed.length,
    failed: failed.map(f => ({ path: f.path, status: f.status, error: f.error })),
    slow: slowEndpoints.map(s => ({ path: s.path, ms: s.responseTime })),
    checkedAt: new Date().toISOString(),
  }).replace(/'/g, "''");
  
  try {
    execSync(
      `${PSQL} "INSERT INTO activity_log (agent_name, action, details) VALUES ('system', 'api_health_check', '${statusJson}')"`,
      { stdio: 'pipe', timeout: 5000 }
    );
  } catch {}
  
  // Log failures
  if (!healthy) {
    const failedSummary = failed.map(f => `${f.name}: ${f.status}`).join(', ');
    try {
      execSync(
        `${PSQL} "INSERT INTO activity_log (agent_name, action, details) VALUES ('system', 'api_health_failure', '${failedSummary.replace(/'/g, "''")}')"`,
        { stdio: 'pipe', timeout: 5000 }
      );
    } catch {}
  }
  
  return { healthy, passed: passed.length, failed: failed.length, total: results.length, results };
}

// Main
const args = process.argv.slice(2);
if (args.includes('--once')) {
  runCheck().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.healthy ? 0 : 1);
  });
} else if (args.includes('--daemon')) {
  console.log('[api-health] Starting daemon (checks every 5 min)...');
  runCheck(); // Initial check
  setInterval(() => {
    runCheck().then(r => {
      if (!r.healthy) {
        console.error(`[api-health] ${new Date().toISOString()} ❌ ${r.failed}/${r.total} failed`);
      }
    });
  }, 5 * 60 * 1000); // Every 5 minutes
} else {
  // Default: run once
  runCheck().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.healthy ? 0 : 1);
  });
}