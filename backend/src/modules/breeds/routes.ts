import { Router, Request, Response } from 'express';
import { query } from '../../db/pool';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const species = req.query.species || 'dog';
    const result = await query(
      'SELECT id, species, name_zh, name_en, base_score, avg_weight_kg FROM breeds WHERE species = $1 ORDER BY base_score ASC, name_zh ASC',
      [species],
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get breeds error:', err);
    res.status(500).json({ error: '获取品种列表失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, species, name_zh, name_en, base_score, avg_weight_kg FROM breeds WHERE id = $1',
      [req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '品种不存在' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get breed error:', err);
    res.status(500).json({ error: '获取品种详情失败' });
  }
});

export default router;
