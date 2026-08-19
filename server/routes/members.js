const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql } = require('../database');

// GET /api/members - list all active members with stats
router.get('/', (req, res) => {
  const members = queryAll(`
    SELECT m.*,
      COALESCE(fines_data.total_fines, 0) as total_fines,
      COALESCE(fines_data.total_paid, 0) as total_paid,
      COALESCE(fines_data.total_unpaid, 0) as total_unpaid,
      COALESCE(fines_data.tasks_missed, 0) as tasks_missed,
      COALESCE(task_data.tasks_completed, 0) as tasks_completed
    FROM members m
    LEFT JOIN (
      SELECT member_id,
        SUM(amount) as total_fines,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as total_unpaid,
        COUNT(*) as tasks_missed
      FROM fines
      GROUP BY member_id
    ) fines_data ON m.id = fines_data.member_id
    LEFT JOIN (
      SELECT member_id, COUNT(*) as tasks_completed
      FROM daily_tasks
      WHERE completed = 1
      GROUP BY member_id
    ) task_data ON m.id = task_data.member_id
    WHERE m.active = 1
    ORDER BY m.id
  `);

  const membersWithStreaks = members.map(m => {
    const streak = calculateStreak(m.id);
    return { ...m, current_streak: streak };
  });

  res.json(membersWithStreaks);
});

// GET /api/members/:id - member profile
router.get('/:id', (req, res) => {
  const member = queryOne(`
    SELECT m.*,
      COALESCE(fines_data.total_fines, 0) as total_fines,
      COALESCE(fines_data.total_paid, 0) as total_paid,
      COALESCE(fines_data.total_unpaid, 0) as total_unpaid,
      COALESCE(fines_data.tasks_missed, 0) as tasks_missed,
      COALESCE(task_data.tasks_completed, 0) as tasks_completed
    FROM members m
    LEFT JOIN (
      SELECT member_id,
        SUM(amount) as total_fines,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as total_unpaid,
        COUNT(*) as tasks_missed
      FROM fines
      GROUP BY member_id
    ) fines_data ON m.id = fines_data.member_id
    LEFT JOIN (
      SELECT member_id, COUNT(*) as tasks_completed
      FROM daily_tasks
      WHERE completed = 1
      GROUP BY member_id
    ) task_data ON m.id = task_data.member_id
    WHERE m.id = ?
  `, [req.params.id]);

  if (!member) return res.status(404).json({ error: 'Member not found' });

  const fines = queryAll(`
    SELECT f.*, m.name as member_name
    FROM fines f
    JOIN members m ON f.member_id = m.id
    WHERE f.member_id = ?
    ORDER BY f.date DESC, f.created_at DESC
  `, [req.params.id]);

  const streak = calculateStreak(member.id);
  res.json({ ...member, current_streak: streak, fines });
});

// POST /api/members
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = runSql('INSERT INTO members (name) VALUES (?)', [name.trim()]);
    const member = queryOne('SELECT * FROM members WHERE id = ?', [result.lastInsertRowid]);

    runSql('INSERT INTO activity_log (action, details, actor) VALUES (?, ?, ?)', [
      'member_added', `${name.trim()} joined the group`, req.cookies?.currentUser || 'System'
    ]);

    res.status(201).json(member);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Member name already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/members/:id
router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const existing = queryOne('SELECT * FROM members WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Member not found' });

  try {
    runSql('UPDATE members SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    runSql('INSERT INTO activity_log (action, details, actor) VALUES (?, ?, ?)', [
      'member_updated', `${existing.name} renamed to ${name.trim()}`, req.cookies?.currentUser || 'System'
    ]);
    const member = queryOne('SELECT * FROM members WHERE id = ?', [req.params.id]);
    res.json(member);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Member name already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/members/:id - soft delete
router.delete('/:id', (req, res) => {
  const member = queryOne('SELECT * FROM members WHERE id = ?', [req.params.id]);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  runSql('UPDATE members SET active = 0 WHERE id = ?', [req.params.id]);
  runSql('INSERT INTO activity_log (action, details, actor) VALUES (?, ?, ?)', [
    'member_removed', `${member.name} was removed from the group`, req.cookies?.currentUser || 'System'
  ]);

  res.json({ message: 'Member removed', member });
});

function calculateStreak(memberId) {
  const tasks = queryAll(`
    SELECT date, completed FROM daily_tasks
    WHERE member_id = ?
    ORDER BY date DESC
    LIMIT 60
  `, [memberId]);

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const task = tasks.find(t => t.date === dateStr);

    if (i === 0 && !task) continue;
    if (task && task.completed === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

module.exports = router;
