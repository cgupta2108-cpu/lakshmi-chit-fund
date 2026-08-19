const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'chitfund.db');
const dataDir = path.dirname(DB_PATH);

let db = null;

async function initDatabase() {
  if (db) return db;

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id),
      UNIQUE(member_id, date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      task_id INTEGER,
      amount INTEGER NOT NULL DEFAULT 10,
      reason TEXT DEFAULT 'Daily task incomplete',
      status TEXT DEFAULT 'unpaid' CHECK(status IN ('paid', 'unpaid')),
      date TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (task_id) REFERENCES daily_tasks(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      actor TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed initial members if empty
  const result = db.exec('SELECT COUNT(*) as count FROM members');
  const count = result[0].values[0][0];
  if (count === 0) {
    const stmt = db.prepare('INSERT INTO members (name) VALUES (?)');
    ['Chaitanya', 'Himanshu', 'Anmol', 'Payal', 'Madhuri'].forEach(name => {
      stmt.run([name]);
    });
    stmt.free();
    console.log('Seeded 5 initial members');
  }

  saveDatabase();
  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run a query that returns rows
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a query that returns one row
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run an INSERT/UPDATE/DELETE
function runSql(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return {
    lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0],
    changes: db.getRowsModified(),
  };
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb, queryAll, queryOne, runSql, saveDatabase };
