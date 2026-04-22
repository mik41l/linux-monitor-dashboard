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

    CREATE TABLE IF NOT EXISTS port_scans (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS port_scans_agent_idx ON port_scans(agent_id);
    CREATE INDEX IF NOT EXISTS port_scans_collected_idx ON port_scans(collected_at);

    CREATE TABLE IF NOT EXISTS firewall_audits (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS firewall_audits_agent_idx ON firewall_audits(agent_id);
    CREATE INDEX IF NOT EXISTS firewall_audits_collected_idx ON firewall_audits(collected_at);

    CREATE TABLE IF NOT EXISTS hardening_reports (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      overall_score INTEGER NOT NULL DEFAULT 0,
      payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS hardening_reports_agent_idx ON hardening_reports(agent_id);
    CREATE INDEX IF NOT EXISTS hardening_reports_collected_idx ON hardening_reports(collected_at);

    CREATE TABLE IF NOT EXISTS login_activity_reports (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      risk_score INTEGER NOT NULL DEFAULT 0,
      payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS login_activity_reports_agent_idx ON login_activity_reports(agent_id);
    CREATE INDEX IF NOT EXISTS login_activity_reports_collected_idx ON login_activity_reports(collected_at);
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      status TEXT NOT NULL DEFAULT 'active',
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
    CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);

    CREATE TABLE IF NOT EXISTS auth_login_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS auth_login_logs_email_idx ON auth_login_logs(email);
    CREATE INDEX IF NOT EXISTS auth_login_logs_created_idx ON auth_login_logs(created_at);

    CREATE TABLE IF NOT EXISTS agent_installs (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      host TEXT NOT NULL,
      ssh_port INTEGER NOT NULL DEFAULT 22,
      ssh_username TEXT NOT NULL,
      auth_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      install_log TEXT NOT NULL DEFAULT '',
      last_error TEXT,
      created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS agent_installs_agent_idx ON agent_installs(agent_id);
    CREATE INDEX IF NOT EXISTS agent_installs_status_idx ON agent_installs(status);
    CREATE INDEX IF NOT EXISTS agent_installs_created_idx ON agent_installs(created_at);
  `);

  await seedDatabase(pool);
}
