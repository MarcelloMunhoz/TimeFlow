// Setup work schedule for existing user
import 'dotenv/config';
import { db } from './server/db.js';
import { users, workSchedules, workScheduleRules } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function setupWorkSchedule() {
  try {
    console.log('🔄 Setting up work schedule for existing user...');
    
    // Get the first active user
    const existingUsers = await db.select().from(users).where(eq(users.isActive, true));
    console.log(`Found ${existingUsers.length} active users:`);
    existingUsers.forEach(user => {
      console.log(`  - ${user.name} (ID: ${user.id}, Email: ${user.email})`);
    });
    
    if (existingUsers.length === 0) {
      console.log('❌ No active users found');
      return;
    }
    
    const mainUser = existingUsers[0];
    console.log(`\n📋 Setting up work schedule for: ${mainUser.name}`);
    
    // Check if user already has a work schedule
    const existingSchedule = await db.select().from(workSchedules).where(eq(workSchedules.userId, mainUser.id));
    
    if (existingSchedule.length > 0) {
      console.log('✅ User already has a work schedule');
      return;
    }
    
    // Create work schedule
    const [schedule] = await db.insert(workSchedules).values({
      userId: mainUser.id,
      name: 'Standard Business Hours',
      timezone: 'America/Sao_Paulo',
      isActive: true
    }).returning();
    
    console.log(`✅ Created work schedule: ${schedule.name} (ID: ${schedule.id})`);
    
    // Create work schedule rules
    const rules = [
      // Monday to Friday - Morning shift: 8:00 AM to 12:00 PM
      { day: 1, start: '08:00', end: '12:00', type: 'work', working: true, overlap: false, desc: 'Morning shift' },
      { day: 2, start: '08:00', end: '12:00', type: 'work', working: true, overlap: false, desc: 'Morning shift' },
      { day: 3, start: '08:00', end: '12:00', type: 'work', working: true, overlap: false, desc: 'Morning shift' },
      { day: 4, start: '08:00', end: '12:00', type: 'work', working: true, overlap: false, desc: 'Morning shift' },
      { day: 5, start: '08:00', end: '12:00', type: 'work', working: true, overlap: false, desc: 'Morning shift' },
      
      // Monday to Friday - Lunch break: 12:00 PM to 1:00 PM
      { day: 1, start: '12:00', end: '13:00', type: 'lunch', working: false, overlap: false, desc: 'Lunch break' },
      { day: 2, start: '12:00', end: '13:00', type: 'lunch', working: false, overlap: false, desc: 'Lunch break' },
      { day: 3, start: '12:00', end: '13:00', type: 'lunch', working: false, overlap: false, desc: 'Lunch break' },
      { day: 4, start: '12:00', end: '13:00', type: 'lunch', working: false, overlap: false, desc: 'Lunch break' },
      { day: 5, start: '12:00', end: '13:00', type: 'lunch', working: false, overlap: false, desc: 'Lunch break' },
      
      // Monday to Friday - Afternoon shift: 1:00 PM to 6:00 PM
      { day: 1, start: '13:00', end: '18:00', type: 'work', working: true, overlap: false, desc: 'Afternoon shift' },
      { day: 2, start: '13:00', end: '18:00', type: 'work', working: true, overlap: false, desc: 'Afternoon shift' },
      { day: 3, start: '13:00', end: '18:00', type: 'work', working: true, overlap: false, desc: 'Afternoon shift' },
      { day: 4, start: '13:00', end: '18:00', type: 'work', working: true, overlap: false, desc: 'Afternoon shift' },
      { day: 5, start: '13:00', end: '18:00', type: 'work', working: true, overlap: false, desc: 'Afternoon shift' },
      
      // Monday to Friday - After hours: 6:00 PM to 11:59 PM (overtime/encaixe allowed)
      { day: 1, start: '18:00', end: '23:59', type: 'work', working: false, overlap: true, desc: 'After hours (overtime)' },
      { day: 2, start: '18:00', end: '23:59', type: 'work', working: false, overlap: true, desc: 'After hours (overtime)' },
      { day: 3, start: '18:00', end: '23:59', type: 'work', working: false, overlap: true, desc: 'After hours (overtime)' },
      { day: 4, start: '18:00', end: '23:59', type: 'work', working: false, overlap: true, desc: 'After hours (overtime)' },
      { day: 5, start: '18:00', end: '23:59', type: 'work', working: false, overlap: true, desc: 'After hours (overtime)' },
      
      // Weekends: Saturday and Sunday (unavailable)
      { day: 0, start: '00:00', end: '23:59', type: 'unavailable', working: false, overlap: false, desc: 'Weekend - Sunday' },
      { day: 6, start: '00:00', end: '23:59', type: 'unavailable', working: false, overlap: false, desc: 'Weekend - Saturday' }
    ];
    
    console.log(`\n📋 Creating ${rules.length} work schedule rules...`);
    
    for (const rule of rules) {
      await db.insert(workScheduleRules).values({
        workScheduleId: schedule.id,
        dayOfWeek: rule.day,
        startTime: rule.start,
        endTime: rule.end,
        ruleType: rule.type,
        isWorkingTime: rule.working,
        allowOverlap: rule.overlap,
        description: rule.desc
      });
    }
    
    console.log('✅ All work schedule rules created');
    
    // Verify the setup
    console.log('\n🔍 Verifying setup...');
    const finalSchedule = await db.select().from(workSchedules).where(eq(workSchedules.userId, mainUser.id));
    const finalRules = await db.select().from(workScheduleRules).where(eq(workScheduleRules.workScheduleId, schedule.id));
    
    console.log(`✅ Work schedule: ${finalSchedule.length} record(s)`);
    console.log(`✅ Work schedule rules: ${finalRules.length} record(s)`);
    
    // Show rules summary
    const rulesByDay = {};
    finalRules.forEach(rule => {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][rule.dayOfWeek];
      if (!rulesByDay[dayName]) rulesByDay[dayName] = [];
      rulesByDay[dayName].push(`${rule.startTime}-${rule.endTime} (${rule.ruleType})`);
    });
    
    console.log('\n📊 Work Schedule Summary:');
    Object.entries(rulesByDay).forEach(([day, rules]) => {
      console.log(`   ${day}: ${rules.join(', ')}`);
    });
    
    console.log('\n🎉 Work schedule setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupWorkSchedule().catch(console.error);
