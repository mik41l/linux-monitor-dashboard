import { pathToFileURL } from "node:url";

import type { Pool } from "pg";

import { createDatabase } from "../config/database.js";
import { readEnv } from "../config/env.js";
import { hashPassword } from "../common/security/password.js";

export async function seedDatabase(pool: Pool) {
  const env = readEnv();

  await pool.query(`
    INSERT INTO alert_rules (name, description, condition, severity)
    VALUES
      ('cpu-threshold', 'CPU usage above 90 percent', '{"metricType":"cpu","operator":">","value":90}', 'critical'),
      ('memory-threshold', 'Memory usage above 90 percent', '{"metricType":"memory","operator":">","value":90}', 'warning'),
      ('disk-threshold', 'Disk usage above 95 percent', '{"metricType":"disk","operator":">","value":95}', 'critical'),
      ('privilege-escalation-correlation', 'Privilege escalation activity detected', '{"eventType":"auth.privilege_escalation"}', 'critical'),
      ('brute-force-correlation', 'Five failed SSH logins from same IP', '{"eventType":"auth.login_failed","threshold":5,"windowMinutes":5}', 'critical'),
      ('resource-anomaly-correlation', 'CPU and memory spike together', '{"metricTypes":["cpu","memory"],"threshold":85}', 'warning')
    ON CONFLICT DO NOTHING;
  `);

  const adminPasswordHash = hashPassword(env.DEFAULT_ADMIN_PASSWORD);

  await pool.query(
    `
      INSERT INTO users (email, username, full_name, role, status, password_hash)
      VALUES ($1, $2, $3, 'admin', 'active', $4)
      ON CONFLICT (email) DO NOTHING;
    `,
    [env.DEFAULT_ADMIN_EMAIL, env.DEFAULT_ADMIN_USERNAME, env.DEFAULT_ADMIN_NAME, adminPasswordHash]
  );
}

async function runSeed() {
  const env = readEnv();
  const database = createDatabase(
    env.DATABASE_URL ?? "postgresql://monitor:monitor_secret@localhost:5432/monitor"
  );

  try {
    await seedDatabase(database.pool);
  } finally {
    await database.pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runSeed();
}
