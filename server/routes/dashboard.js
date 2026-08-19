const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../database');

// GET /api/dashboard
router.get('/', (req, res) => {
  const totals = queryOne(`
    SELECT
      COALESCE(SUM(amount), 0) as total_fines,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) as total_unpaid,
      COUNT(*) as fine_count
    FROM fines
  `) || { total_fines: 0, total_paid: 0, total_unpaid: 0, fine_count: 0 };

  const totalTasksCompleted = (queryOne('SELECT COUNT(*) as count FROM daily_tasks WHERE completed = 1') || { count: 0 }).count;

  const topFinePayer = queryOne(`
    SELECT m.name, COALESCE(SUM(f.amount), 0) as total
    FROM members m
    LEFT JOIN fines f ON m.id = f.member_id
    WHERE m.active = 1
    GROUP BY m.id
    ORDER BY total DESC
    LIMIT 1
  `);

  const mostDisciplined = queryOne(`
    SELECT m.name,
      COALESCE(fine_data.fine_count, 0) as fine_count,
      COALESCE(task_data.completed_count, 0) as completed_count
    FROM members m
    LEFT JOIN (
      SELECT member_id, COUNT(*) as fine_count FROM fines GROUP BY member_id
    ) fine_data ON m.id = fine_data.member_id
    LEFT JOIN (
      SELECT member_id, COUNT(*) as completed_count FROM daily_tasks WHERE completed = 1 GROUP BY member_id
    ) task_data ON m.id = task_data.member_id
    WHERE m.active = 1
    ORDER BY fine_count ASC, completed_count DESC
    LIMIT 1
  `);

  const leaderboard = queryAll(`
    SELECT m.id, m.name,
      COALESCE(fine_data.total_unpaid, 0) as total_unpaid,
      COALESCE(fine_data.fine_count, 0) as tasks_missed,
      COALESCE(task_data.completed_count, 0) as tasks_completed
    FROM members m
    LEFT JOIN (
      SELECT member_id,
        SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as total_unpaid,
        COUNT(*) as fine_count
      FROM fines GROUP BY member_id
    ) fine_data ON m.id = fine_data.member_id
    LEFT JOIN (
      SELECT member_id, COUNT(*) as completed_count FROM daily_tasks WHERE completed = 1 GROUP BY member_id
    ) task_data ON m.id = task_data.member_id
    WHERE m.active = 1
    ORDER BY tasks_completed DESC, total_unpaid ASC, tasks_missed ASC
  `);

  res.json({
    totals: { ...totals, tasks_missed: totals.fine_count, tasks_completed: totalTasksCompleted },
    top_fine_payer: topFinePayer,
    most_disciplined: mostDisciplined,
    leaderboard,
  });
});

// GET /api/activity
router.get('/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json(queryAll('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?', [limit]));
});

module.exports = router;
