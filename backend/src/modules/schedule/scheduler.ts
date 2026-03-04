import { query } from '../../db/pool';

interface DayCapacity {
  max_total_score: number;
  max_dogs: number;
  business_start: string;
  business_end: string;
}

function generateSlots(businessStart: string, businessEnd: string, date: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = businessStart.split(':').map(Number);
  const [endH, endM] = businessEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m < endMinutes; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const timeStr = `${date}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
    slots.push(timeStr);
  }
  return slots;
}

async function getOrCreateCapacity(date: string): Promise<DayCapacity> {
  let result = await query('SELECT max_total_score, max_dogs, business_start, business_end FROM daily_capacity WHERE date = $1', [date]);

  if (result.rows.length === 0) {
    await query(
      'INSERT INTO daily_capacity (date) VALUES ($1) ON CONFLICT (date) DO NOTHING',
      [date],
    );
    result = await query('SELECT max_total_score, max_dogs, business_start, business_end FROM daily_capacity WHERE date = $1', [date]);
  }

  const row = result.rows[0];
  return {
    max_total_score: parseFloat(row.max_total_score),
    max_dogs: row.max_dogs,
    business_start: row.business_start,
    business_end: row.business_end,
  };
}

/** 流水线作业：5/4 分占 1 小时（2 个 slot），3/2/1 分占半小时（1 个 slot） */
export function getEstimatedDurationMinutes(score: number): number {
  return score >= 4 ? 60 : 30;
}

/**
 * Returns available half-hour slots for a given date that can accommodate a pet with the given score.
 * Each existing appointment occupies consecutive slots based on its estimated_duration_minutes.
 * A slot is available only if the pet's required consecutive slots are all free.
 */
export async function getAvailableSlots(
  date: string,
  petScore: number,
): Promise<{ slot_time: string; available: boolean }[]> {
  const cap = await getOrCreateCapacity(date);
  const slots = generateSlots(cap.business_start, cap.business_end, date);

  const occupiedResult = await query(
    `SELECT slot_time, calculated_score, estimated_duration_minutes FROM appointments
     WHERE date = $1 AND status != 'cancelled'`,
    [date],
  );

  const occupiedSlots = new Set<string>();
  let usedScore = 0;
  let usedDogs = 0;

  for (const row of occupiedResult.rows) {
    if (row.slot_time) {
      const startMs = new Date(row.slot_time).getTime();
      const numSlots = Math.max(1, Math.ceil(row.estimated_duration_minutes / 30));
      for (let i = 0; i < numSlots; i++) {
        occupiedSlots.add(new Date(startMs + i * 30 * 60 * 1000).toISOString());
      }
    }
    usedScore += parseFloat(row.calculated_score);
    usedDogs += 1;
  }

  const capacityFull = usedScore >= cap.max_total_score * 0.95;
  const scoreOverflow = usedScore + petScore > cap.max_total_score;
  const dogsOverflow = usedDogs + 1 > cap.max_dogs;

  const needSlots = Math.ceil(getEstimatedDurationMinutes(petScore) / 30);

  const slotISOs = slots.map((s) => new Date(s).toISOString());

  return slots.map((slot, idx) => {
    let consecutive = true;
    for (let i = 0; i < needSlots; i++) {
      if (idx + i >= slotISOs.length || occupiedSlots.has(slotISOs[idx + i])) {
        consecutive = false;
        break;
      }
    }

    return {
      slot_time: slot,
      available: consecutive && !scoreOverflow && !dogsOverflow && !capacityFull,
    };
  });
}

export async function getDayStats(date: string) {
  const cap = await getOrCreateCapacity(date);

  const sqlWithArrived = `
    SELECT
       COUNT(*) FILTER (WHERE status != 'cancelled') as total_dogs,
       COALESCE(SUM(calculated_score) FILTER (WHERE status != 'cancelled'), 0) as total_score,
       COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
       COUNT(*) FILTER (WHERE status = 'arrived') as arrived_count,
       COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
       COUNT(*) FILTER (WHERE status = 'ready_for_pickup') as ready_count,
       COUNT(*) FILTER (WHERE status = 'picked_up') as picked_up_count
     FROM appointments WHERE date = $1`;
  const sqlWithoutArrived = `
    SELECT
       COUNT(*) FILTER (WHERE status != 'cancelled') as total_dogs,
       COALESCE(SUM(calculated_score) FILTER (WHERE status != 'cancelled'), 0) as total_score,
       COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
       COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
       COUNT(*) FILTER (WHERE status = 'ready_for_pickup') as ready_count,
       COUNT(*) FILTER (WHERE status = 'picked_up') as picked_up_count
     FROM appointments WHERE date = $1`;

  let result;
  try {
    result = await query(sqlWithArrived, [date]);
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    if (msg.includes('arrived') || msg.includes('enum')) {
      result = await query(sqlWithoutArrived, [date]);
      result.rows[0].arrived_count = 0;
    } else {
      throw err;
    }
  }

  const stats = result.rows[0];
  return {
    date,
    capacity: cap,
    used_score: parseFloat(stats.total_score),
    used_dogs: parseInt(stats.total_dogs),
    pending_count: parseInt(stats.pending_count),
    arrived_count: parseInt(stats.arrived_count ?? 0),
    in_progress_count: parseInt(stats.in_progress_count),
    ready_count: parseInt(stats.ready_count),
    picked_up_count: parseInt(stats.picked_up_count),
    score_percentage: cap.max_total_score > 0
      ? Math.round((parseFloat(stats.total_score) / cap.max_total_score) * 100)
      : 0,
    dogs_percentage: cap.max_dogs > 0
      ? Math.round((parseInt(stats.total_dogs) / cap.max_dogs) * 100)
      : 0,
  };
}
