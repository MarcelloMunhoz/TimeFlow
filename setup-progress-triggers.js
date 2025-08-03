import { Client } from 'pg';
import { readFileSync } from 'fs';

async function setupProgressTriggers() {
  const client = new Client({
    connectionString: 'postgres://timeflow:timeflow123@localhost:5432/timeflowdb'
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    console.log('📝 Creating progress calculation triggers...');
    const triggerSQL = readFileSync('create-progress-triggers.sql', 'utf8');
    await client.query(triggerSQL);
    console.log('✅ Progress triggers created successfully');

    console.log('✅ Triggers are now active and will automatically update progress');

  } catch (error) {
    console.error('❌ Error setting up progress triggers:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

setupProgressTriggers();
