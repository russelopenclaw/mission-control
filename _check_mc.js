// Read-only check of Mission Control DB for existing 1On1 transcription records.
const { Client } = require('pg');
const fs = require('fs');

const env = {};
fs.readFileSync('/home/kevin/.openclaw/workspace/mission-control/.env.local', 'utf8')
  .split('\n').forEach(l => {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2];
  });

(async () => {
  const c = new Client({
    host: env.DB_HOST, port: parseInt(env.DB_PORT || '5432'),
    user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
  });
  await c.connect();
  const tables = (await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  )).rows.map(r => r.table_name);
  console.log('TABLES:', tables);

  for (const t of tables) {
    if (t.match(/transcrib|audio|meeting/i)) {
      console.log(`\n--- ${t} ---`);
      const cols = (await c.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [t]
      )).rows;
      for (const r of cols) console.log(`  ${r.column_name.padEnd(30)} ${r.data_type}`);
      const rows = (await c.query(`SELECT * FROM ${t} ORDER BY 1 DESC LIMIT 10`)).rows;
      for (const row of rows) {
        const cleaned = {};
        for (const [k, v] of Object.entries(row)) {
          if (typeof v === 'string' && v.length > 80) cleaned[k] = v.slice(0, 77) + '...';
          else cleaned[k] = v;
        }
        console.log('  ', JSON.stringify(cleaned));
      }
    }
  }
  await c.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
