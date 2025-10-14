import mysql from "mysql2/promise";
import { env } from "./env.js";

let pool;

export function getDbPool() {
  if (!pool) {
    const sslConfig = (() => {
      if (!env.DB_SSL) return undefined;
      // Prefer explicit CA if given
      if (env.DB_SSL_CA && env.DB_SSL_CA.trim().length > 0) {
        return { ca: env.DB_SSL_CA };
      }
      if (env.DB_SSL_CA_PATH && env.DB_SSL_CA_PATH.trim().length > 0) {
        try {
          const fs = require("fs");
          const ca = fs.readFileSync(env.DB_SSL_CA_PATH, "utf8");
          return { ca };
        } catch {}
      }
      // Fallback: allow insecure (not recommended) only if explicitly requested via DB_SSL=true with no CA
      // For local dev containers that lack root CAs, you can set DB_SSL=false instead.
      return { rejectUnauthorized: false };
    })();

    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: sslConfig,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function initDb() {
  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      status ENUM('todo','inprogress','done') NOT NULL DEFAULT 'todo',
      done TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_status (status),
      INDEX idx_done (done)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}
