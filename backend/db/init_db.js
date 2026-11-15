require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not defined in environment');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function init() {
  console.log('Initializing database schema on Neon...');

  await sql.query(`
    CREATE TABLE IF NOT EXISTS bins (
      id SERIAL PRIMARY KEY,
      bin_path VARCHAR NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
      chaos_config JSONB DEFAULT '{"enabled": false, "statusCode": 200, "responseBody": "OK", "delayMs": 0, "failureRate": 0, "failureStatusCode": 500}'::jsonb
    );
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      bin_id INT NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
      received_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
      http_method VARCHAR NOT NULL,
      http_path VARCHAR NOT NULL,
      headers JSONB NOT NULL DEFAULT '{}'::jsonb,
      query_params JSONB NOT NULL DEFAULT '{}'::jsonb,
      raw_body TEXT DEFAULT '',
      body JSONB DEFAULT NULL,
      ip VARCHAR,
      mongo_id VARCHAR
    );
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS replays (
      id SERIAL PRIMARY KEY,
      request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      target_url TEXT NOT NULL,
      method VARCHAR NOT NULL,
      headers JSONB NOT NULL DEFAULT '{}'::jsonb,
      body TEXT,
      response_status INT,
      response_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
      response_body TEXT,
      latency_ms INT,
      error_message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
    );
  `);

  await sql.query(`CREATE INDEX IF NOT EXISTS idx_bins_path ON bins(bin_path);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_requests_bin ON requests(bin_id);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_requests_received ON requests(received_at DESC);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_replays_request ON replays(request_id);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_replays_created ON replays(created_at DESC);`);

  console.log('Neon database tables and indices initialized successfully!');
}

init().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
