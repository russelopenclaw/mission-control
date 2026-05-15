import { NextRequest, NextResponse } from 'next/server';

const DB_URL = process.env.DATABASE_URL || 'postgresql://alfred:AlfredDB2026Secure@localhost:5432/mission_control';

/**
 * Persistent Event Bus using PostgreSQL LISTEN/NOTIFY
 * 
 * POST /api/events - Publish an event (from heartbeat, cron, agents)
 * GET /api/events - Get recent events (for initial load / polling fallback)
 * 
 * Events are stored in PostgreSQL for persistence, and NOTIFY is used
 * for real-time push to any connected listeners.
 */

interface Event {
  id?: number;
  channel: string;
  data: Record<string, unknown>;
  timestamp: string;
}

async function queryPg(sql: string, params?: any[]): Promise<any> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const result = params ? await client.query(sql, params) : await client.query(sql);
    return result;
  } finally {
    await client.end();
  }
}

async function ensureTable() {
  await queryPg(`
    CREATE TABLE IF NOT EXISTS event_log (
      id SERIAL PRIMARY KEY,
      channel VARCHAR(50) NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_event_log_channel ON event_log (channel);
    CREATE INDEX IF NOT EXISTS idx_event_log_created ON event_log (created_at DESC);
  `);
}

// Initialize table on first import
let tableEnsured = false;
async function ensureTableOnce() {
  if (!tableEnsured) {
    await ensureTable();
    tableEnsured = true;
  }
}

/**
 * POST - Publish event
 * Body: { channel: string, data: object }
 * 
 * Stores event in PostgreSQL and sends NOTIFY for real-time listeners.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureTableOnce();
    
    const body = await request.json();
    const { channel, data } = body;

    if (!channel || !data) {
      return NextResponse.json(
        { error: 'channel and data are required' },
        { status: 400 }
      );
    }

    // Store event
    const result = await queryPg(
      `INSERT INTO event_log (channel, data) VALUES ($1, $2) RETURNING id, created_at`,
      [channel, JSON.stringify(data)]
    );

    const eventId = result.rows[0].id;
    const createdAt = result.rows[0].created_at;

    // Send PostgreSQL NOTIFY for real-time listeners
    const payload = JSON.stringify({ id: eventId, channel, data, timestamp: createdAt });
    await queryPg(`SELECT pg_notify('mc_events', $1)`, [payload]);

    // Clean up old events (>7 days)
    await queryPg(`DELETE FROM event_log WHERE created_at < NOW() - INTERVAL '7 days'`);

    return NextResponse.json({ 
      success: true, 
      id: eventId, 
      channel, 
      timestamp: createdAt 
    });
  } catch (error) {
    console.error('[Events POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to publish event', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET - Get recent events
 * Query params: channel (optional), limit (default 50)
 * 
 * Returns recent events for initial page load / polling fallback.
 */
export async function GET(request: NextRequest) {
  try {
    await ensureTableOnce();
    
    const url = new URL(request.url);
    const channel = url.searchParams.get('channel');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

    let sql, params;
    if (channel) {
      sql = `SELECT id, channel, data, created_at FROM event_log WHERE channel = $1 ORDER BY created_at DESC LIMIT $2`;
      params = [channel, limit];
    } else {
      sql = `SELECT id, channel, data, created_at FROM event_log ORDER BY created_at DESC LIMIT $1`;
      params = [limit];
    }

    const result = await queryPg(sql, params);

    const events = result.rows.map((row: any) => ({
      id: row.id,
      channel: row.channel,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      timestamp: row.created_at,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('[Events GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';