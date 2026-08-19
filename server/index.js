const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize database, then start server
initDatabase().then(() => {
  // API routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/members', require('./routes/members'));
  app.use('/api/fines', require('./routes/fines'));
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/dashboard', require('./routes/dashboard'));

  // Activity route is under dashboard
  app.get('/api/activity', (req, res) => {
    const dashboardRouter = require('./routes/dashboard');
    // Forward to the activity endpoint
    const { queryAll } = require('./database');
    const limit = parseInt(req.query.limit) || 20;
    res.json(queryAll('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?', [limit]));
  });

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n  Lakshmi Chit Fund running at http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
