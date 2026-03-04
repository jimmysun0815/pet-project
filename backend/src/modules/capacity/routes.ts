import { Router, Request, Response } from 'express';
import { query } from '../../db/pool';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    let result = await query('SELECT * FROM daily_capacity WHERE date = $1', [date]);

    if (result.rows.length === 0) {
      await query('INSERT INTO daily_capacity (date) VALUES ($1) ON CONFLICT (date) DO NOTHING', [date]);
      result = await query('SELECT * FROM daily_capacity WHERE date = $1', [date]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get capacity error:', err);
    res.status(500).json({ error: '获取容量配置失败' });
  }
});

router.put('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { date, max_total_score, max_dogs, business_start, business_end } = req.body;
    if (!date) {
      return res.status(400).json({ error: '请提供日期' });
    }

    const result = await query(
      `INSERT INTO daily_capacity (date, max_total_score, max_dogs, business_start, business_end)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (date) DO UPDATE SET
         max_total_score = COALESCE($2, daily_capacity.max_total_score),
         max_dogs = COALESCE($3, daily_capacity.max_dogs),
         business_start = COALESCE($4, daily_capacity.business_start),
         business_end = COALESCE($5, daily_capacity.business_end),
         updated_at = NOW()
       RETURNING *`,
      [date, max_total_score || 60, max_dogs || 20, business_start || '08:00', business_end || '18:00'],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update capacity error:', err);
    res.status(500).json({ error: '更新容量配置失败' });
  }
});

export default router;
