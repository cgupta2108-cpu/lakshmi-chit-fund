const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'chitfund.db');

async function resetData() {
  const SQL = await initSqlJs();
  if (!fs.existsSync(DB_PATH)) {
    console.log('No DB file found.');
    return;
  }
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  db.run('DELETE FROM fines;');
  db.run('DELETE FROM daily_tasks;');
  db.run('DELETE FROM activity_log;');
  db.run("DELETE FROM sqlite_sequence WHERE name IN ('fines', 'daily_tasks', 'activity_log');");

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log('Reset complete: fines=0, tasks=0, activity reset.');
}

resetData();
