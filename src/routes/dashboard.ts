import { Router, Request } from 'express';
import pool from '../config/database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: any) => {
  try {
    const userId = req.user?.userId;
    const days = parseInt(req.query.days as string) || 30;

    const aspectsResult = await pool.query(
      `SELECT UNNEST(life_aspects) as aspect, COUNT(*) as count
       FROM entries WHERE user_id = $1 AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY aspect ORDER BY count DESC`,
      [userId]
    );

    const trendsResult = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM entries WHERE user_id = $1 AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at) ORDER BY date DESC`,
      [userId]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM entries WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const insightsResult = await pool.query(
      `SELECT id, insight_text, aspect, created_at, entry_ids FROM insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );

    // Format recent insights with entry_count
    const recent_insights = insightsResult.rows.map((insight: any) => ({
      id: insight.id,
      insight_text: insight.insight_text,
      created_at: insight.created_at,
      entry_count: insight.entry_ids ? insight.entry_ids.length : 0
    }));

    const sourceResult = await pool.query(
      `SELECT source, COUNT(*) as count FROM entries WHERE user_id = $1 AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '${days} days' GROUP BY source`,
      [userId]
    );

    res.json({
      summary: {
        total_entries: parseInt(totalResult.rows[0].total),
        period_days: days,
        entries_in_period: trendsResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0)
      },
      aspects: aspectsResult.rows,
      trends: trendsResult.rows,
      sources: sourceResult.rows,
      recent_insights
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
