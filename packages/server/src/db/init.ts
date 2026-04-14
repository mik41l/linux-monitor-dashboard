import type { Pool } from "pg";

import { seedDatabase } from "./seed.js";

export async function ensureDatabase(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL UNIQUE,
      hostname TEXT NOT NULL,
      ip_address TEXT,
      os_info JSONB,
      status TEXT NOT NULL DEFAULT 'online',
      last_heartbeat TIMESTAMPTZ,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      metric_type TEXT NOT NULL,
      value JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS metrics_agent_type_idx ON metrics(agent_id, metric_type);
    CREATE INDEX IF NOT EXISTS metrics_collected_at_idx ON metrics(collected_at);

    CREATE TABLE IF NOT EXISTS security_events (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      source TEXT,
      message TEXT,
      details JSONB,
      correlated_event_id INTEGER,
      occurred_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS security_events_agent_idx ON security_events(agent_id);
    CREATE INDEX IF NOT EXISTS security_events_occurred_at_idx ON security_events(occurred_at);
    CREATE INDEX IF NOT EXISTS security_events_severity_idx ON security_events(severity);

    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      rule_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      agent_id TEXT REFERENCES agents(agent_id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      related_events JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      condition JSONB NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sshd_audits (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      config_path TEXT NOT NULL,
      payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sshd_audits_agent_idx ON sshd_audits(agent_id);
    CREATE INDEX IF NOT EXISTS sshd_audits_collected_idx ON sshd_audits(collected_at);
  `);

  await pool.query(`
    DELETE FROM alert_rules
    WHERE id IN (
      SELECT duplicate.id
      FROM alert_rules AS duplicate
      JOIN (
        SELECT name, MIN(id) AS keep_id
        FROM alert_rules
        GROUP BY name
      ) AS canonical
        ON canonical.name = duplicate.name
      WHERE duplicate.id <> canonical.keep_id
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS alert_rules_name_unique ON alert_rules(name);
  `);

  await seedDatabase(pool);
}
