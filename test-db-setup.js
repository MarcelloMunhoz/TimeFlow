// Simple database setup test
import 'dotenv/config';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function testDbSetup() {
  try {
    console.log('🧪 Testing Database Setup...\n');
    
    // Check if work schedule tables exist
    console.log('📋 Checking work schedule tables...');
    
    const workSchedulesCount = await db.execute(sql`SELECT COUNT(*) FROM work_schedules`);
    console.log(`✅ work_schedules: ${workSchedulesCount.rows[0].count} records`);
    
    const workScheduleRulesCount = await db.execute(sql`SELECT COUNT(*) FROM work_schedule_rules`);
    console.log(`✅ work_schedule_rules: ${workScheduleRulesCount.rows[0].count} records`);
    
    // Check users
    const usersCount = await db.execute(sql`SELECT COUNT(*) FROM users WHERE is_active = true`);
    console.log(`✅ active users: ${usersCount.rows[0].count} records`);
    
    // Get user details
    const users = await db.execute(sql`SELECT id, name, email FROM users WHERE is_active = true LIMIT 5`);
    console.log('\n📊 Active users:');
    users.rows.forEach(user => {
      console.log(`  - ${user.name} (ID: ${user.id}, Email: ${user.email})`);
    });
    
    // Check if any user has a work schedule
    const userSchedules = await db.execute(sql`
      SELECT u.name, u.id as user_id, ws.name as schedule_name, ws.id as schedule_id
      FROM users u 
      LEFT JOIN work_schedules ws ON u.id = ws.user_id 
      WHERE u.is_active = true
    `);
    
    console.log('\n📊 User work schedules:');
    userSchedules.rows.forEach(row => {
      if (row.schedule_name) {
        console.log(`  ✅ ${row.name}: ${row.schedule_name} (Schedule ID: ${row.schedule_id})`);
      } else {
        console.log(`  ❌ ${row.name}: No work schedule`);
      }
    });
    
    console.log('\n🎉 Database setup test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDbSetup().catch(console.error);
