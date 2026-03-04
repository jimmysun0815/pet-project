import { Router, Request, Response } from 'express';
import { query } from '../../db/pool';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';
import { getAvailableSlots, getDayStats, getEstimatedDurationMinutes } from '../schedule/scheduler';

const router = Router();

/** 确保 slot_time 以 ISO 带 Z 返回，避免前端解析为本地午夜显示 00:00 */
function toISOSlot(val: unknown): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val as string | number);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function mapAppointmentRow(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row, slot_time: toISOSlot(row.slot_time) };
}

router.get('/available-slots', authenticate, async (req: Request, res: Response) => {
  try {
    const { date, pet_id } = req.query;
    if (!date || !pet_id) {
      return res.status(400).json({ error: '请提供日期和宠物ID' });
    }

    const petResult = await query('SELECT base_score FROM pets WHERE id = $1 AND owner_id = $2', [
      pet_id,
      req.user!.userId,
    ]);
    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const petScore = parseFloat(petResult.rows[0].base_score);
    const slots = await getAvailableSlots(date as string, petScore);
    const available = slots.filter((s) => s.available);

    res.json({
      date,
      pet_score: petScore,
      estimated_duration_minutes: getEstimatedDurationMinutes(petScore),
      slots,
      is_full: available.length === 0,
    });
  } catch (err) {
    console.error('Available slots error:', err);
    res.status(500).json({ error: '获取可用时间失败' });
  }
});

router.get('/availability-range', authenticate, async (req: Request, res: Response) => {
  try {
    const petId = req.query.pet_id;
    if (!petId) {
      return res.status(400).json({ error: '请提供宠物ID' });
    }

    const petResult = await query('SELECT base_score FROM pets WHERE id = $1 AND owner_id = $2', [
      petId,
      req.user!.userId,
    ]);
    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: '宠物不存在' });
    }

    const petScore = parseFloat(petResult.rows[0].base_score);
    const from = (req.query.from as string) || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
    const days = Math.min(Math.max(1, parseInt(req.query.days as string) || 35), 42);

    const results: { date: string; available: boolean }[] = [];
    const startDate = new Date(from + 'T12:00:00Z');

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' });
      const slots = await getAvailableSlots(dateStr, petScore);
      const hasAvailable = slots.some((s) => s.available);
      results.push({ date: dateStr, available: hasAvailable });
    }

    res.json({ dates: results });
  } catch (err) {
    console.error('Availability range error:', err);
    res.status(500).json({ error: '获取日期可用性失败' });
  }
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { pet_id, service_type, date, slot_time, notes } = req.body;
    if (!pet_id || !date) {
      return res.status(400).json({ error: '请提供宠物和日期' });
    }

    const petResult = await query('SELECT base_score, owner_id FROM pets WHERE id = $1', [pet_id]);
    if (petResult.rows.length === 0) {
      return res.status(404).json({ error: '宠物不存在' });
    }
    if (petResult.rows[0].owner_id !== req.user!.userId) {
      return res.status(403).json({ error: '无权为该宠物预约' });
    }

    const existing = await query(
      `SELECT id, date, slot_time FROM appointments WHERE pet_id = $1 AND status IN ('pending', 'arrived', 'in_progress', 'ready_for_pickup')`,
      [pet_id],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: '该宠物已有进行中的预约，同一只宠物只能有一个预约' });
    }

    const score = parseFloat(petResult.rows[0].base_score);
    const duration = getEstimatedDurationMinutes(score);

    const result = await query(
      `INSERT INTO appointments (pet_id, service_type, date, slot_time, calculated_score, estimated_duration_minutes, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, pet_id, service_type, date, slot_time, calculated_score, status, estimated_duration_minutes, notes`,
      [pet_id, service_type || 'full_grooming', date, slot_time || null, score, duration, notes ? String(notes).trim() || null : null],
    );

    const updated = await query(
      `SELECT a.id, a.pet_id, a.service_type, a.date, a.slot_time, a.calculated_score,
              a.status, a.estimated_duration_minutes, a.notes, p.name as pet_name,
              b.name_zh as breed_name
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       JOIN breeds b ON p.breed_id = b.id
       WHERE a.id = $1`,
      [result.rows[0].id],
    );

    res.status(201).json(mapAppointmentRow(updated.rows[0]));
  } catch (err) {
    console.error('Create appointment error:', err);
    res.status(500).json({ error: '创建预约失败' });
  }
});

router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT a.id, a.pet_id, a.service_type, a.date, a.slot_time, a.calculated_score,
              a.status, a.estimated_duration_minutes, a.notes, a.created_at,
              p.name as pet_name, b.name_zh as breed_name
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       JOIN breeds b ON p.breed_id = b.id
       WHERE p.owner_id = $1
       ORDER BY a.date DESC, a.slot_time ASC`,
      [req.user!.userId],
    );
    res.json(result.rows.map((r) => mapAppointmentRow(r)));
  } catch (err) {
    console.error('Get my appointments error:', err);
    res.status(500).json({ error: '获取预约列表失败' });
  }
});

router.get('/day', authenticate, requireRole('staff', 'admin'), async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const withSortOrder = `
      SELECT a.id, a.pet_id, a.service_type, a.date, a.slot_time, a.calculated_score,
             a.status, a.estimated_duration_minutes, a.notes, a.sort_order, a.created_at,
             p.name as pet_name, p.weight_kg, p.species,
             b.name_zh as breed_name, b.name_en as breed_name_en,
             u.name as owner_name, u.phone as owner_phone
      FROM appointments a
      JOIN pets p ON a.pet_id = p.id
      JOIN breeds b ON p.breed_id = b.id
      JOIN users u ON p.owner_id = u.id
      WHERE a.date = $1 AND a.status != 'cancelled'
      ORDER BY a.sort_order ASC NULLS LAST, a.slot_time ASC NULLS LAST, a.calculated_score DESC`;
    const withoutSortOrder = `
      SELECT a.id, a.pet_id, a.service_type, a.date, a.slot_time, a.calculated_score,
             a.status, a.estimated_duration_minutes, a.notes, a.created_at,
             p.name as pet_name, p.weight_kg, p.species,
             b.name_zh as breed_name, b.name_en as breed_name_en,
             u.name as owner_name, u.phone as owner_phone
      FROM appointments a
      JOIN pets p ON a.pet_id = p.id
      JOIN breeds b ON p.breed_id = b.id
      JOIN users u ON p.owner_id = u.id
      WHERE a.date = $1 AND a.status != 'cancelled'
      ORDER BY a.slot_time ASC NULLS LAST, a.calculated_score DESC`;
    let result;
    try {
      result = await query(withSortOrder, [date]);
    } catch (colErr: any) {
      const msg = String(colErr?.message || colErr || '');
      if (msg.includes('sort_order') || msg.includes('column')) {
        result = await query(withoutSortOrder, [date]);
        for (let i = 0; i < result.rows.length; i++) {
          result.rows[i].sort_order = i;
        }
      } else {
        throw colErr;
      }
    }
    res.json(result.rows.map((r) => mapAppointmentRow(r)));
  } catch (err) {
    console.error('Get day appointments error:', err);
    res.status(500).json({ error: '获取当日预约失败' });
  }
});

router.get('/stats', authenticate, requireRole('staff', 'admin'), async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const stats = await getDayStats(date);
    res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: '获取统计失败' });
  }
});

router.put('/day-order', authenticate, requireRole('staff', 'admin'), async (req: Request, res: Response) => {
  try {
    const { date, appointment_ids } = req.body;
    if (!date || !Array.isArray(appointment_ids)) {
      return res.status(400).json({ error: '请提供 date 和 appointment_ids 数组' });
    }
    const ids = appointment_ids.filter((id: unknown) => Number.isInteger(Number(id))).map((id: unknown) => Number(id));
    if (ids.length === 0) {
      return res.status(400).json({ error: 'appointment_ids 不能为空' });
    }
    try {
      for (let i = 0; i < ids.length; i++) {
        await query(
          'UPDATE appointments SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND date = $3 AND status != $4',
          [i, ids[i], date, 'cancelled'],
        );
      }
    } catch (updateErr: any) {
      if (String(updateErr?.message || '').includes('sort_order')) {
        return res.json({ ok: true });
      }
      throw updateErr;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Update day order error:', err);
    res.status(500).json({ error: '保存顺序失败' });
  }
});

router.patch('/:id/status', authenticate, requireRole('staff', 'admin'), async (req: Request, res: Response) => {
  try {
    const { status, calculated_score: calculatedScore } = req.body;
    const validTransitions: Record<string, string[]> = {
      pending: ['arrived', 'cancelled'],
      arrived: ['in_progress'],
      in_progress: ['ready_for_pickup'],
      ready_for_pickup: ['picked_up'],
    };

    const current = await query('SELECT status FROM appointments WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: '预约不存在' });
    }

    const currentStatus = current.rows[0].status;
    if (!validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({ error: `不能从 ${currentStatus} 转换到 ${status}` });
    }

    let result;
    if (status === 'ready_for_pickup' && calculatedScore != null) {
      const score = parseFloat(calculatedScore);
      if (Number.isNaN(score) || score < 1 || score > 5) {
        return res.status(400).json({ error: '分数须在 1～5 之间' });
      }
      result = await query(
        'UPDATE appointments SET status = $1, calculated_score = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [status, score, req.params.id],
      );
    } else {
      result = await query(
        'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, req.params.id],
      );
    }

    res.json(mapAppointmentRow(result.rows[0]));
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: '更新状态失败' });
  }
});

router.patch('/:id/slot', authenticate, requireRole('staff', 'admin'), async (req: Request, res: Response) => {
  try {
    const { slot_time } = req.body;
    if (!slot_time) {
      return res.status(400).json({ error: '请提供新的时间槽' });
    }

    const apptResult = await query('SELECT id, date, calculated_score, status FROM appointments WHERE id = $1', [
      req.params.id,
    ]);
    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: '预约不存在' });
    }
    const appt = apptResult.rows[0];
    if (appt.status !== 'pending') {
      return res.status(400).json({ error: '只能调整未开始的预约' });
    }

    const conflict = await query(
      `SELECT id FROM appointments WHERE date = $1 AND slot_time = $2 AND id != $3 AND status != 'cancelled'`,
      [appt.date, slot_time, req.params.id],
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: '该时间槽已被占用' });
    }

    const result = await query(
      'UPDATE appointments SET slot_time = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [slot_time, req.params.id],
    );

    res.json(mapAppointmentRow(result.rows[0]));
  } catch (err) {
    console.error('Update slot error:', err);
    res.status(500).json({ error: '调整时间失败' });
  }
});

export default router;
