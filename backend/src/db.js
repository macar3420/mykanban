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
  // Core auth tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Ensure display_name is unique to support username-style login
  try {
    await db.query(`ALTER TABLE users ADD UNIQUE KEY uq_users_display_name (display_name)`);
  } catch (e) {
    // ER_DUP_KEYNAME (1061) means the unique index already exists
    if (e?.errno !== 1061) throw e;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token CHAR(64) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_sessions_token (token),
      INDEX idx_sessions_user (user_id),
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Password reset tokens
  await db.query(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token CHAR(64) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_reset_token (token),
      INDEX idx_rt_user (user_id),
      CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Collaboration tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_teams_owner (created_by),
      CONSTRAINT fk_teams_owner FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      team_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      role ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
      added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (team_id, user_id),
      INDEX idx_tm_user (user_id),
      CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Boards (either personal or team-owned)
  await db.query(`
    CREATE TABLE IF NOT EXISTS boards (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      team_id BIGINT UNSIGNED NULL,
      owner_user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_boards_team (team_id),
      INDEX idx_boards_owner (owner_user_id),
      CONSTRAINT fk_boards_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      CONSTRAINT fk_boards_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Existing tasks table (create if not exists)
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

  // Add board linkage to tasks (idempotent via error-code checks)
  try {
    await db.query(`ALTER TABLE tasks ADD COLUMN board_id BIGINT UNSIGNED NULL`);
  } catch (e) {
    // ER_DUP_FIELDNAME (1060) means the column already exists
    if (e?.errno !== 1060) throw e;
  }
  try {
    await db.query(`ALTER TABLE tasks ADD INDEX idx_tasks_board (board_id)`);
  } catch (e) {
    // ER_DUP_KEYNAME (1061)
    if (e?.errno !== 1061) throw e;
  }
  try {
    await db.query(`ALTER TABLE tasks ADD CONSTRAINT fk_tasks_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL`);
  } catch (e) {
    // ER_CANNOT_ADD_FOREIGN (1215) for other issues, ER_DUP_KEYNAME (1061) for existing constraint name varies per version.
    // ER_FK_DUP_NAME (1826) MySQL 8 for duplicate FK name
    if (![1061, 1826].includes(e?.errno)) throw e;
  }

  // Migration: ensure a default board exists and attach legacy tasks without board
  // Create a singleton default board (owner_user_id NULL) if none exists
  const [boards] = await db.query("SELECT id FROM boards ORDER BY id ASC LIMIT 1");
  let defaultBoardId = boards[0]?.id;
  if (!defaultBoardId) {
    const [ins] = await db.query("INSERT INTO boards (name) VALUES (?)", ["Default Board"]);
    defaultBoardId = ins.insertId;
  }
  // Attach tasks missing board_id to the default board
  await db.query("UPDATE tasks SET board_id = ? WHERE board_id IS NULL", [defaultBoardId]);
}
