// Test script to verify appointment deletion functionality
import 'dotenv/config';
import { db } from './server/db.js';
import { appointments, projects, companies, users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testDeletionFunctionality() {
  console.log('🧪 Testing appointment deletion functionality...\n');
  
  try {
    // 1. Get current appointments count
    const initialAppointments = await db.select().from(appointments);
    console.log(`📊 Initial appointments count: ${initialAppointments.length}`);
    
    if (initialAppointments.length === 0) {
      console.log('⚠️ No appointments found to test deletion');
      return;
    }
    
    // 2. Create a test appointment for deletion
    console.log('\n🔧 Creating test appointment for deletion...');
    
    // Get first available project, company, and user
    const [testProject] = await db.select().from(projects).limit(1);
    const [testCompany] = await db.select().from(companies).limit(1);
    const [testUser] = await db.select().from(users).limit(1);
    
    if (!testProject || !testCompany || !testUser) {
      console.log('❌ Missing required data (project, company, or user) for test');
      return;
    }
    
    const testAppointment = {
      title: 'TEST DELETION APPOINTMENT',
      description: 'This is a test appointment for deletion testing',
      date: '2025-07-30',
      startTime: '23:59',
      endTime: '23:59',
      durationMinutes: 1,
      projectId: testProject.id,
      companyId: testCompany.id,
      userId: testUser.id,
      status: 'scheduled',
      isPomodoro: false,
      priority: 'medium',
      timerState: 'stopped',
      accumulatedTimeMinutes: 0,
      actualTimeMinutes: 0
    };
    
    const [createdAppointment] = await db.insert(appointments)
      .values(testAppointment)
      .returning();
    
    console.log(`✅ Created test appointment: ID ${createdAppointment.id} - "${createdAppointment.title}"`);
    
    // 3. Test deletion
    console.log('\n🗑️ Testing deletion...');
    
    // Verify appointment exists
    const beforeDeletion = await db.select()
      .from(appointments)
      .where(eq(appointments.id, createdAppointment.id));
    
    if (beforeDeletion.length === 0) {
      console.log('❌ Test appointment not found before deletion');
      return;
    }
    
    console.log(`📋 Confirmed appointment exists: "${beforeDeletion[0].title}"`);
    
    // Perform deletion
    const deleteResult = await db.delete(appointments)
      .where(eq(appointments.id, createdAppointment.id));
    
    console.log(`📊 Delete operation affected ${deleteResult.rowCount} rows`);
    
    // Verify deletion
    const afterDeletion = await db.select()
      .from(appointments)
      .where(eq(appointments.id, createdAppointment.id));
    
    if (afterDeletion.length === 0) {
      console.log('✅ Appointment successfully deleted');
    } else {
      console.log('❌ Appointment still exists after deletion');
      return;
    }
    
    // 4. Test edge cases
    console.log('\n🧪 Testing edge cases...');
    
    // Test deletion of non-existent appointment
    const nonExistentId = 999999;
    const nonExistentResult = await db.delete(appointments)
      .where(eq(appointments.id, nonExistentId));
    
    console.log(`📊 Deleting non-existent appointment (ID ${nonExistentId}): ${nonExistentResult.rowCount} rows affected`);
    
    if (nonExistentResult.rowCount === 0) {
      console.log('✅ Correctly handled non-existent appointment deletion');
    } else {
      console.log('❌ Unexpected result when deleting non-existent appointment');
    }
    
    // 5. Final verification
    const finalAppointments = await db.select().from(appointments);
    console.log(`\n📊 Final appointments count: ${finalAppointments.length}`);
    console.log(`📊 Expected count: ${initialAppointments.length} (same as initial)`);
    
    if (finalAppointments.length === initialAppointments.length) {
      console.log('✅ Appointment count matches expected (test appointment was properly cleaned up)');
    } else {
      console.log('⚠️ Appointment count differs from expected');
    }
    
    console.log('\n🎉 Deletion functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during deletion test:', error);
    console.error('❌ Stack trace:', error.stack);
  }
}

async function main() {
  console.log('🚀 Starting deletion functionality test...\n');
  await testDeletionFunctionality();
  process.exit(0);
}

main().catch(console.error);
