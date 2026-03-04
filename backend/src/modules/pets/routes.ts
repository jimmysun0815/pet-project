import { Router, Request, Response } from 'express';
import { query } from '../../db/pool';
import { authenticate } from '../../middleware/auth';
import { calculatePetScore } from '../../utils/scoreCalculator';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT p.id, p.name, p.species, p.breed_id, p.weight_kg, p.age_years, p.base_score,
              b.name_zh as breed_name_zh, b.name_en as breed_name_en, b.avg_weight_kg as breed_avg_weight
       FROM pets p
       JOIN breeds b ON p.breed_id = b.id
       WHERE p.owner_id = $1
       ORDER BY p.created_at DESC`,
      [req.user!.userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get pets error:', err);
    res.status(500).json({ error: '获取宠物列表失败' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, species, breed_id, weight_kg, age_years } = req.body;
    if (!name || !breed_id || !weight_kg || age_years === undefined) {
      return res.status(400).json({ error: '宠物名称、品种、体重和年龄为必填项' });
    }

    const breedResult = await query('SELECT base_score, avg_weight_kg FROM breeds WHERE id = $1', [breed_id]);
    if (breedResult.rows.length === 0) {
      return res.status(400).json({ error: '品种不存在' });
    }

    const breed = breedResult.rows[0];
    const baseScore = calculatePetScore(
      parseFloat(breed.base_score),
      breed.avg_weight_kg ? parseFloat(breed.avg_weight_kg) : null,
      parseFloat(weight_kg),
      parseFloat(age_years),
    );

    const result = await query(
      `INSERT INTO pets (owner_id, name, species, breed_id, weight_kg, age_years, base_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, species, breed_id, weight_kg, age_years, base_score`,
      [req.user!.userId, name, species || 'dog', breed_id, weight_kg, age_years, baseScore],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create pet error:', err);
    res.status(500).json({ error: '添加宠物失败' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, breed_id, weight_kg, age_years } = req.body;

    const petCheck = await query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [
      req.params.id,
      req.user!.userId,
    ]);
    if (petCheck.rows.length === 0) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const breedResult = await query('SELECT base_score, avg_weight_kg FROM breeds WHERE id = $1', [breed_id]);
    if (breedResult.rows.length === 0) {
      return res.status(400).json({ error: '品种不存在' });
    }

    const breed = breedResult.rows[0];
    const baseScore = calculatePetScore(
      parseFloat(breed.base_score),
      breed.avg_weight_kg ? parseFloat(breed.avg_weight_kg) : null,
      parseFloat(weight_kg),
      parseFloat(age_years),
    );

    const result = await query(
      `UPDATE pets SET name = $1, breed_id = $2, weight_kg = $3, age_years = $4, base_score = $5, updated_at = NOW()
       WHERE id = $6 AND owner_id = $7
       RETURNING id, name, species, breed_id, weight_kg, age_years, base_score`,
      [name, breed_id, weight_kg, age_years, baseScore, req.params.id, req.user!.userId],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update pet error:', err);
    res.status(500).json({ error: '更新宠物失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM pets WHERE id = $1 AND owner_id = $2 RETURNING id', [
      req.params.id,
      req.user!.userId,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '宠物不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete pet error:', err);
    res.status(500).json({ error: '删除宠物失败' });
  }
});

export default router;
