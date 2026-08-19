const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const isVercel = !!process.env.VERCEL;
const DB_PATH = isVercel
  ? path.join('/tmp', 'chitfund.db')
  : path.join(__dirname, '..', 'data', 'chitfund.db');
const dataDir = path.dirname(DB_PATH);

let db = null;
let initPromise = null;

async function initDatabase() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (isVercel && !fs.existsSync(DB_PATH)) {
        const bundledPath = path.join(__dirname, '..', 'data', 'chitfund.db');
        if (fs.existsSync(bundledPath)) {
          try {
            fs.copyFileSync(bundledPath, DB_PATH);
          } catch (e) {
            console.error('Failed to copy bundled db:', e);
          }
        }
      }

      const wasmCandidatePaths = [
        path.join(__dirname, 'sql-wasm.wasm'),
        path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
        path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm')
      ];
      const foundWasm = wasmCandidatePaths.find(p => fs.existsSync(p));

      const SQL = await initSqlJs({
        locateFile: file => {
          if (file.endsWith('.wasm') && foundWasm) {
            return foundWasm;
          }
          return file;
        }
      });

      if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
      } else {
        db = new SQL.Database();
      }

      db.run('PRAGMA foreign_keys = ON');

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
      const count = result.length && result[0].values.length ? result[0].values[0][0] : 0;
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
    } catch (err) {
      initPromise = null;
      console.error('Database initialization error:', err);
      throw err;
    }
  })();

  return initPromise;
}

function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

function queryAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runSql(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
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
