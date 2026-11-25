import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../games.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    show_logout_warning INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    played_at TEXT NOT NULL,
    bet INTEGER NOT NULL,
    hp_before INTEGER NOT NULL,
    hp_after INTEGER NOT NULL,
    result TEXT NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    run_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    current_floor INTEGER NOT NULL DEFAULT 1,
    max_floors INTEGER NOT NULL DEFAULT 999,
    hp INTEGER NOT NULL DEFAULT 50,
    max_hp INTEGER NOT NULL DEFAULT 50,
    perks TEXT NOT NULL DEFAULT '[]',
    used_perks TEXT NOT NULL DEFAULT '[]',
    fool_effect_id TEXT,
    moon_active INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    games_played INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Миграции для существующих БД
try { db.exec(`ALTER TABLE users ADD COLUMN show_logout_warning INTEGER NOT NULL DEFAULT 1`); } catch {}
try { db.exec(`ALTER TABLE runs ADD COLUMN used_perks TEXT NOT NULL DEFAULT '[]'`); } catch {}
try { db.exec(`ALTER TABLE runs ADD COLUMN fool_effect_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE runs ADD COLUMN moon_active INTEGER NOT NULL DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE runs ADD COLUMN max_floors INTEGER NOT NULL DEFAULT 999`); } catch {}

export { db };