// Test script to manually run the phases migration
import 'dotenv/config';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function runManualMigration() {
  console.log('🔄 Running manual phases migration...\n');

  try {
    // Create phases table
    console.log('📝 Creating phases table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS phases (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#8B5CF6',
        created_at TEXT NOT NULL DEFAULT (now()::text)
      )
    `);
    console.log('✅ Phases table created successfully');

    // Create project_phases junction table
    console.log('📝 Creating project_phases junction table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_phases (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        phase_id INTEGER NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
        deadline TEXT,
        created_at TEXT NOT NULL DEFAULT (now()::text),
        UNIQUE(project_id, phase_id)
      )
    `);
    console.log('✅ Project phases junction table created successfully');

    // Add phase_id column to appointments table
    console.log('📝 Adding phase_id column to appointments table...');
    await db.execute(sql`
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phase_id INTEGER REFERENCES phases(id)
    `);
    console.log('✅ Phase_id column added to appointments table');

    // Insert default phases
    console.log('📝 Inserting default phases...');
    await db.execute(sql`
      INSERT INTO phases (name, description, color) VALUES
        ('Understanding Phase', 'Initial analysis and requirement gathering', '#3B82F6'),
        ('Solution Phase', 'Design and planning of the solution', '#10B981'),
        ('Implementation Phase', 'Development and coding work', '#F59E0B'),
        ('Testing Phase', 'Quality assurance and testing', '#EF4444'),
        ('Deployment Phase', 'Release and deployment activities', '#8B5CF6'),
        ('Maintenance Phase', 'Ongoing support and maintenance', '#6B7280')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Default phases inserted successfully');

    // Create indexes
    console.log('📝 Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases(project_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_project_phases_phase_id ON project_phases(phase_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_appointments_phase_id ON appointments(phase_id)
    `);
    console.log('✅ Indexes created successfully');

    // Test the phases table
    console.log('\n📝 Testing phases table...');
    const phases = await db.execute(sql`SELECT * FROM phases`);
    console.log('✅ Phases table query successful');
    console.log('📊 Found phases:', phases.rows?.length || 0);

    console.log('\n🎉 Manual migration completed successfully!');

  } catch (error) {
    console.error('❌ Manual migration failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the migration
runManualMigration().catch(console.error);
