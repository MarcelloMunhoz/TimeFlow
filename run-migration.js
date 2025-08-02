// Simple migration runner
import 'dotenv/config';
import { db } from './server/db.js';
import { readFileSync } from 'fs';

async function runMigration() {
  try {
    console.log('🔄 Running work schedule system migration...');
    
    const migrationSQL = readFileSync('./server/migrations/add-work-schedule-system.sql', 'utf8');
    
    // Execute the entire migration as one transaction
    console.log('📝 Executing migration...');
    try {
      await db.execute(migrationSQL);
      console.log('✅ Migration executed successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('ℹ️ Migration skipped (already exists)');
      } else {
        console.error('❌ Migration failed:', error.message);
        throw error;
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
    // Verify the migration by checking if tables exist
    console.log('\n🔍 Verifying migration...');
    
    try {
      const workSchedules = await db.execute('SELECT COUNT(*) FROM work_schedules');
      console.log(`✅ work_schedules table exists with ${workSchedules.rows[0].count} records`);
      
      const workScheduleRules = await db.execute('SELECT COUNT(*) FROM work_schedule_rules');
      console.log(`✅ work_schedule_rules table exists with ${workScheduleRules.rows[0].count} records`);
      
      console.log('🎉 Migration verification completed!');
    } catch (error) {
      console.error('❌ Migration verification failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
