import pool from './pool';

const migrations = [
  {
    name: '001_create_breeds',
    sql: `
      CREATE TYPE species_type AS ENUM ('dog', 'cat');

      CREATE TABLE IF NOT EXISTS breeds (
        id SERIAL PRIMARY KEY,
        species species_type NOT NULL DEFAULT 'dog',
        name_zh VARCHAR(100) NOT NULL,
        name_en VARCHAR(200) NOT NULL,
        base_score NUMERIC(3,1) NOT NULL CHECK (base_score >= 1 AND base_score <= 5),
        avg_weight_kg NUMERIC(5,1),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_breeds_species ON breeds(species);
    `,
  },
  {
    name: '002_create_users',
    sql: `
      CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role user_role NOT NULL DEFAULT 'customer',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_users_email ON users(email);
    `,
  },
  {
    name: '003_create_pets',
    sql: `
      CREATE TABLE IF NOT EXISTS pets (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        species species_type NOT NULL DEFAULT 'dog',
        breed_id INTEGER NOT NULL REFERENCES breeds(id),
        weight_kg NUMERIC(5,1) NOT NULL,
        age_years NUMERIC(4,1) NOT NULL,
        base_score NUMERIC(3,1) NOT NULL CHECK (base_score >= 1 AND base_score <= 5),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_pets_owner ON pets(owner_id);
    `,
  },
  {
    name: '004_create_appointments',
    sql: `
      CREATE TYPE appointment_status AS ENUM ('pending', 'in_progress', 'ready_for_pickup', 'picked_up', 'cancelled');
      CREATE TYPE service_type AS ENUM ('bath', 'full_grooming', 'basic_trim');

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        service_type service_type NOT NULL DEFAULT 'full_grooming',
        date DATE NOT NULL,
        slot_time TIMESTAMP WITH TIME ZONE,
        calculated_score NUMERIC(3,1) NOT NULL,
        status appointment_status NOT NULL DEFAULT 'pending',
        estimated_duration_minutes INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_appointments_date ON appointments(date);
      CREATE INDEX idx_appointments_status ON appointments(status);
      CREATE INDEX idx_appointments_pet ON appointments(pet_id);
      CREATE INDEX idx_appointments_slot ON appointments(date, slot_time);
    `,
  },
  {
    name: '005_create_daily_capacity',
    sql: `
      CREATE TABLE IF NOT EXISTS daily_capacity (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        max_total_score NUMERIC(5,1) NOT NULL DEFAULT 60,
        max_dogs INTEGER NOT NULL DEFAULT 20,
        business_start TIME NOT NULL DEFAULT '08:00',
        business_end TIME NOT NULL DEFAULT '18:00',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX idx_daily_capacity_date ON daily_capacity(date);
    `,
  },
  {
    name: '006_create_migrations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
  },
  {
    name: '007_add_appointment_notes',
    sql: `
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;
    `,
  },
  {
    name: '008_add_arrived_status_and_sort_order',
    sql: `
      ALTER TYPE appointment_status ADD VALUE 'arrived';
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    `,
  },
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Ensure migrations table exists first
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    for (const migration of migrations) {
      const result = await client.query('SELECT id FROM migrations WHERE name = $1', [migration.name]);
      if (result.rows.length === 0) {
        console.log(`Running migration: ${migration.name}`);
        await client.query('BEGIN');
        try {
          await client.query(migration.sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
          await client.query('COMMIT');
          console.log(`  ✓ ${migration.name} completed`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`  ✗ ${migration.name} failed:`, err);
          throw err;
        }
      } else {
        console.log(`  - ${migration.name} already applied`);
      }
    }

    console.log('All migrations completed.');
  } finally {
    client.release();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
