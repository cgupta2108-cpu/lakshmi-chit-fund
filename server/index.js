const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDatabase, queryAll } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ensure database is initialized before handling any route
app.use(async (req, res, next) => {
  try {
    await initDatabase();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database initialization failed', details: err.message });
  }
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/fines', require('./routes/fines'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Activity route
app.get('/api/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(queryAll('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?', [limit]));
});

// SPA fallback for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start local server if run directly
if (require.main === module) {
  initDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`\n  Lakshmi Chit Fund running at http://localhost:${PORT}\n`);
    });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}

module.exports = app;
