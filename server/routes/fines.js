const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runSql } = require('../database');

// GET /api/fines - list fines with optional filters
router.get('/', (req, res) => {
  let query = `
    SELECT f.*, m.name as member_name
    FROM fines f
    JOIN members m ON f.member_id = m.id
    WHERE 1=1
  `;
  const params = [];

  if (req.query.member_id) {
    query += ' AND f.member_id = ?';
    params.push(parseInt(req.query.member_id));
  }
  if (req.query.status) {
    query += ' AND f.status = ?';
    params.push(req.query.status);
  }
  if (req.query.date) {
    query += ' AND f.date = ?';
    params.push(req.query.date);
  }
  if (req.query.date_from) {
    query += ' AND f.date >= ?';
    params.push(req.query.date_from);
  }
  if (req.query.date_to) {
    query += ' AND f.date <= ?';
    params.push(req.query.date_to);
  }

  query += ' ORDER BY f.date DESC, f.created_at DESC';

  if (req.query.limit) {
    query += ' LIMIT ?';
    params.push(parseInt(req.query.limit));
  }

  const fines = queryAll(query, params);
  res.json(fines);
});

// POST /api/fines
router.post('/', (req, res) => {
  const { member_id, amount, reason, date, status, task_id } = req.body;
  if (!member_id) return res.status(400).json({ error: 'Member is required' });

  const member = queryOne('SELECT * FROM members WHERE id = ? AND active = 1', [member_id]);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const fineAmount = amount || 10;
  const fineReason = reason || 'Daily task incomplete';
  const fineDate = date || new Date().toISOString().split('T')[0];
  const fineStatus = status || 'unpaid';
  const actor = req.cookies?.currentUser || 'System';

  const result = runSql(`
    INSERT INTO fines (member_id, task_id, amount, reason, status, date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [member_id, task_id || null, fineAmount, fineReason, fineStatus, fineDate, actor]);

  const fine = queryOne(`
    SELECT f.*, m.name as member_name FROM fines f
    JOIN members m ON f.member_id = m.id WHERE f.id = ?
  `, [result.lastInsertRowid]);

  runSql('INSERT INTO activity_log (action, details, actor) VALUES (?, ?, ?)', [
    'fine_added', `₹${fineAmount} fine added to ${member.name} — ${fineReason}`, actor
  ]);

  res.status(201).json(fine);
});

// PUT /api/fines/:id
router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT f.*, m.name as member_name FROM fines f JOIN members m ON f.member_id = m.id WHERE f.id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Fine not found' });

  const { member_id, amount, reason, date, status } = req.body;
  const actor = req.cookies?.currentUser || 'System';

  const updates = {
    member_id: member_id || existing.member_id,
    amount: amount !== undefined ? amount : existing.amount,
    reason: reason !== undefined ? reason : existing.reason,
    date: date || existing.date,
    status: status || existing.status,
  };

  runSql(`
    UPDATE fines SET member_id = ?, amount = ?, reason = ?, date = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [updates.member_id, updates.amount, updates.reason, updates.date, updates.status, req.params.id]);

  const fine = queryOne('SELECT f.*, m.name as member_name FROM fines f JOIN members m ON f.member_id = m.id WHERE f.id = ?', [req.params.id]);

  const changes = [];
  if (amount !== undefined && amount !== existing.amount) changes.push(`₹${existing.amount} → ₹${amount}`);
  if (status && status !== existing.status) changes.push(`${existing.status} → ${status}`);
  if (reason && reason !== existing.reason) changes.push('reason updated');

  if (changes.length > 0) {
    runSql('INSERT INTO activity_log (action, details, actor) VALUES (?, ?, ?)', [
      'fine_updated', `${existing.member_name}'s fine updated: ${changes.join(', ')}`, actor
    ]);
  }

  res.json(fine);
});

// PATCH /api/fines/:id/pay
router.patch('/:id/pay', (req, res) => {
  const existing = queryOne('SELECT f.*, m.name as member_name FROM fines f JOIN members m ON f.member_id = m.id WHERE f.id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Fine not found' });

  const newStatus = existing.status === 'paid' ? 'unpaid' : 'paid';
  const actor = req.cookies?.currentUser || 'System';

  runSql("UPDATE fines SET status = ?, updated_at = datetime('now') WHERE id = ?", [newStatus, req.params.id]);

  const fine = queryOne('SELECT f.*, m.name as member_name FROM fines f JOIN members m ON f.member_id = m.id WHERE f.id = ?', [req.params.id]);

  runSql('INSERT INTO activity_log (action, details, actor) VALUES (?, ?, ?)', [
    newStatus === 'paid' ? 'fine_paid' : 'fine_unpaid',
    `${actor} marked ${existing.member_name}'s ₹${existing.amount} fine as ${newStatus}`,
    actor
  ]);

  res.json(fine);
});

// DELETE /api/fines/:id
router.delete('/:id', (req, res) => {
  const existing = queryOne('SELECT f.*, m.name as member_name FROM fines f JOIN members m ON f.member_id = m.id WHERE f.id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Fine not found' });

  const actor = req.cookies?.currentUser || 'System';
  runSql('DELETE FROM fines WHERE id = ?', [req.params.id]);
  runSql('INSERT INTO activity_log (action, details, actor) VALUES (?, ?, ?)', [
    'fine_deleted', `${actor} deleted ${existing.member_name}'s ₹${existing.amount} fine`, actor
  ]);

  res.json({ message: 'Fine deleted' });
});

module.exports = router;
