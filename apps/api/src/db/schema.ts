import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../fatefi.db');

let db: Database.Database;

export function getDb(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initSchema();
    }
    return db;
}

function initSchema() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT UNIQUE NOT NULL,
      username TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      total_points INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tarot_draws (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_name TEXT NOT NULL,
      orientation TEXT NOT NULL CHECK (orientation IN ('upright', 'reversed')),
      date TEXT UNIQUE NOT NULL,
      ai_interpretation TEXT
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tarot_draw_id INTEGER NOT NULL,
      prediction_type TEXT NOT NULL DEFAULT 'direction',
      selected_option TEXT NOT NULL,
      result TEXT DEFAULT 'pending' CHECK (result IN ('correct', 'incorrect', 'pending')),
      score INTEGER DEFAULT 0,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tarot_draw_id) REFERENCES tarot_draws(id),
      UNIQUE(user_id, tarot_draw_id)
    );

    CREATE TABLE IF NOT EXISTS nonces (
      wallet_address TEXT PRIMARY KEY,
      nonce TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
