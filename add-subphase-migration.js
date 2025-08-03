import { Client } from 'pg';

async function addSubphaseColumn() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    console.log('📝 Adding project_subphase_id column to appointments...');
    await client.query(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS project_subphase_id INTEGER 
      REFERENCES project_subphases(id) ON DELETE SET NULL
    `);
    console.log('✅ Column added successfully');

    console.log('📝 Creating index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_project_subphase_id 
      ON appointments(project_subphase_id)
    `);
    console.log('✅ Index created successfully');

    console.log('📝 Verifying column...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'appointments' 
      AND column_name = 'project_subphase_id'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verified:', result.rows[0]);
    } else {
      console.log('❌ Column not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

addSubphaseColumn();
