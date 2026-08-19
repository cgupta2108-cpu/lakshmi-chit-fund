const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql } = require('../database');

// GET /api/tasks/today
router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const members = queryAll('SELECT * FROM members WHERE active = 1 ORDER BY id');

  const tasks = members.map(member => {
    const task = queryOne('SELECT * FROM daily_tasks WHERE member_id = ? AND date = ?', [member.id, today]);
    return {
      member_id: member.id,
      member_name: member.name,
      date: today,
      completed: task ? task.completed : null,
      task_id: task ? task.id : null,
    };
  });

  res.json(tasks);
});

// PUT /api/tasks/:memberId/today
router.put('/:memberId/today', (req, res) => {
  const { completed } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const memberId = parseInt(req.params.memberId);
  const actor = req.cookies?.currentUser || 'System';

  const member = queryOne('SELECT * FROM members WHERE id = ? AND active = 1', [memberId]);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  let task = queryOne('SELECT * FROM daily_tasks WHERE member_id = ? AND date = ?', [memberId, today]);

  if (task) {
    runSql('UPDATE daily_tasks SET completed = ?, completed_at = ? WHERE id = ?', [
      completed ? 1 : 0,
      completed ? new Date().toISOString() : null,
      task.id
    ]);
  } else {
    const result = runSql('INSERT INTO daily_tasks (member_id, date, completed, completed_at) VALUES (?, ?, ?, ?)', [
      memberId, today, completed ? 1 : 0, completed ? new Date().toISOString() : null
    ]);
    task = { id: result.lastInsertRowid };
  }

  runSql('INSERT INTO activity_log (action, details, actor) VALUES (?, ?, ?)', [
    completed ? 'task_completed' : 'task_incomplete',
    completed ? `${member.name} completed today's task` : `${member.name} didn't complete today's task`,
    actor
  ]);

  const responseData = {
    member_id: memberId,
    member_name: member.name,
    date: today,
    completed: completed ? 1 : 0,
    task_id: task.id,
    auto_fine_prompt: !completed,
  };

  res.json(responseData);
});

// GET /api/tasks/history
router.get('/history', (req, res) => {
  let query = 'SELECT dt.*, m.name as member_name FROM daily_tasks dt JOIN members m ON dt.member_id = m.id WHERE 1=1';
  const params = [];

  if (req.query.date) { query += ' AND dt.date = ?'; params.push(req.query.date); }
  if (req.query.member_id) { query += ' AND dt.member_id = ?'; params.push(parseInt(req.query.member_id)); }

  query += ' ORDER BY dt.date DESC, m.name ASC';
  if (req.query.limit) { query += ' LIMIT ?'; params.push(parseInt(req.query.limit)); }

  res.json(queryAll(query, params));
});

module.exports = router;
