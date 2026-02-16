import { Router, Request } from 'express';
import pool from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { generateInsights } from '../services/groq';

const router = Router();

router.use(authMiddleware);

router.post('/generate', async (req: Request, res: any) => {
  try {
    const userId = req.user?.userId;
    const days = parseInt(req.body.days as string) || 7;

    const result = await pool.query(
      `SELECT id, raw_text, transcribed_text, life_aspects, created_at
       FROM entries 
       WHERE user_id = $1 AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '${days} days'
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ message: 'No entries found', insights: null });
    }

    const entries = result.rows.map((row: any) =>
      row.transcribed_text || row.raw_text
    );

    const insights = await generateInsights(entries);
    const entryIds = result.rows.map((row: any) => row.id);
    
    const insertResult = await pool.query(
      `INSERT INTO insights (user_id, entry_ids, insight_text, aspect, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [userId, entryIds, insights, 'general']
    );

    const insight = {
      ...insertResult.rows[0],
      time_period_days: days,
      entry_count: entries.length
    };

    res.json({ insight });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

router.get('/', async (req: Request, res: any) => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await pool.query(
      `SELECT * FROM insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );

    // Add calculated fields for frontend compatibility
    const insights = result.rows.map(insight => ({
      ...insight,
      time_period_days: 7, // Default value, could be stored in DB
      entry_count: insight.entry_ids ? insight.entry_ids.length : 0
    }));

    res.json({ insights });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

export default router;
