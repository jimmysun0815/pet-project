import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import pool from './pool';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding breeds from dog.csv...');

    const csvPath = path.resolve(__dirname, '../../../dog.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    await client.query('DELETE FROM breeds WHERE species = $1', ['dog']);
    console.log('  Cleared existing dog breeds.');

    let inserted = 0;
    for (const record of records as Record<string, string>[]) {
      const nameZh = record['中文名称'];
      const baseScore = parseFloat(record['基础分数']);
      const nameEn = record['英文名称'];
      const rawWeight = record['平均重量 (kg)'];

      let avgWeight: number | null = null;
      const parsed = parseFloat(rawWeight);
      if (!isNaN(parsed)) {
        avgWeight = parsed;
      }

      if (!nameZh || isNaN(baseScore) || !nameEn) {
        console.warn(`  Skipping invalid row: ${JSON.stringify(record)}`);
        continue;
      }

      await client.query(
        `INSERT INTO breeds (species, name_zh, name_en, base_score, avg_weight_kg)
         VALUES ('dog', $1, $2, $3, $4)`,
        [nameZh, nameEn, baseScore, avgWeight],
      );
      inserted++;
    }

    console.log(`  ✓ ${inserted} dog breeds imported.`);

    console.log('Creating default admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (email, phone, name, password_hash, role)
       VALUES ('admin@petshop.com', '1234567890', '店长', $1, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [adminPassword],
    );
    console.log('  ✓ Default admin created (admin@petshop.com / admin123)');

    console.log('Seed completed.');
  } catch (err) {
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
