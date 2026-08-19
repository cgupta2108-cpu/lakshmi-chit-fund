const express = require('express');
const router = express.Router();
const { queryOne } = require('../database');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const member = queryOne('SELECT * FROM members WHERE name = ? AND active = 1', [name]);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  res.cookie('currentUser', member.name, {
    httpOnly: false,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });

  res.json({ name: member.name, id: member.id });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const name = req.cookies?.currentUser;
  if (!name) return res.json({ authenticated: false });

  const member = queryOne('SELECT * FROM members WHERE name = ? AND active = 1', [name]);
  if (!member) return res.json({ authenticated: false });

  res.json({ authenticated: true, name: member.name, id: member.id });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('currentUser');
  res.json({ message: 'Logged out' });
});

module.exports = router;
