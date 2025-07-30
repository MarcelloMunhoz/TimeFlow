// Test script to verify recurring task functionality
import 'dotenv/config';
import { db } from './server/db.js';
import { appointments, projects, companies, users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testRecurringTaskFunctionality() {
  console.log('🧪 Testing recurring task functionality...\n');
  
  try {
    // 1. Get required data for test
    const [testProject] = await db.select().from(projects).limit(1);
    const [testCompany] = await db.select().from(companies).limit(1);
    const [testUser] = await db.select().from(users).limit(1);
    
    if (!testProject || !testCompany || !testUser) {
      console.log('❌ Missing required data (project, company, or user) for test');
      return;
    }
    
    console.log(`📋 Using test data:`);
    console.log(`   Project: ${testProject.name} (ID: ${testProject.id})`);
    console.log(`   Company: ${testCompany.name} (ID: ${testCompany.id})`);
    console.log(`   User: ${testUser.name} (ID: ${testUser.id})\n`);
    
    // 2. Test recurring task creation via API
    console.log('🔄 Testing recurring task creation via API...');
    
    const recurringTaskData = {
      title: 'Daily Standup Meeting',
      description: 'Daily team standup meeting',
      date: '2025-07-31', // Thursday
      startTime: '09:00',
      durationMinutes: 30,
      projectId: testProject.id,
      companyId: testCompany.id,
      assignedUserId: testUser.id,
      isRecurring: true,
      recurrencePattern: 'daily',
      recurrenceInterval: 1,
      recurrenceEndCount: 5, // Create 5 instances
      isPomodoro: false,
    };
    
    console.log('📝 Sending POST request to /api/appointments/recurring...');
    
    const response = await fetch('http://localhost:5000/api/appointments/recurring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recurringTaskData),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.log(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.log(`❌ Error details: ${errorData}`);
      return;
    }
    
    const result = await response.json();
    console.log(`✅ Recurring task created successfully!`);
    console.log(`   Template ID: ${result.template.id}`);
    console.log(`   Instances created: ${result.instances.length}`);
    console.log(`   Recurring Task ID: ${result.template.recurringTaskId}\n`);
    
    // 3. Verify the instances in database
    console.log('🔍 Verifying instances in database...');
    
    const instances = await db.select().from(appointments)
      .where(eq(appointments.recurringTaskId, result.template.recurringTaskId))
      .orderBy(appointments.date);
    
    console.log(`📊 Found ${instances.length} total appointments (including template)`);
    
    instances.forEach((instance, index) => {
      const type = instance.isRecurringTemplate ? 'Template' : 'Instance';
      const weekendNote = instance.wasRescheduledFromWeekend ? ' (Rescheduled from weekend)' : '';
      console.log(`   ${index + 1}. ${type}: ${instance.title} - ${instance.date}${weekendNote}`);
    });
    
    // 4. Test weekend rescheduling
    console.log('\n🗓️ Testing weekend rescheduling...');
    
    const weekendTaskData = {
      title: 'Weekend Task Test',
      description: 'This should be rescheduled to Monday',
      date: '2025-08-02', // Saturday
      startTime: '10:00',
      durationMinutes: 60,
      projectId: testProject.id,
      companyId: testCompany.id,
      assignedUserId: testUser.id,
      isRecurring: true,
      recurrencePattern: 'weekly',
      recurrenceInterval: 1,
      recurrenceEndCount: 3,
      isPomodoro: false,
    };
    
    const weekendResponse = await fetch('http://localhost:5000/api/appointments/recurring', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(weekendTaskData),
    });
    
    if (weekendResponse.ok) {
      const weekendResult = await weekendResponse.json();
      console.log(`✅ Weekend task created successfully!`);
      
      const weekendInstances = await db.select().from(appointments)
        .where(eq(appointments.recurringTaskId, weekendResult.template.recurringTaskId))
        .orderBy(appointments.date);
      
      console.log(`📊 Weekend task instances:`);
      weekendInstances.forEach((instance, index) => {
        const type = instance.isRecurringTemplate ? 'Template' : 'Instance';
        const weekendNote = instance.wasRescheduledFromWeekend ? ' (Rescheduled from weekend)' : '';
        const originalNote = instance.originalDate ? ` (Original: ${instance.originalDate})` : '';
        console.log(`   ${index + 1}. ${type}: ${instance.date}${weekendNote}${originalNote}`);
      });
    } else {
      console.log(`❌ Weekend task creation failed: ${weekendResponse.status}`);
    }
    
    // 5. Test recurring task deletion
    console.log('\n🗑️ Testing recurring task deletion...');
    
    const deleteResponse = await fetch(`http://localhost:5000/api/appointments/recurring/${result.template.recurringTaskId}`, {
      method: 'DELETE',
    });
    
    if (deleteResponse.ok) {
      console.log(`✅ Recurring task series deleted successfully`);
      
      // Verify deletion
      const remainingInstances = await db.select().from(appointments)
        .where(eq(appointments.recurringTaskId, result.template.recurringTaskId));
      
      console.log(`📊 Remaining instances after deletion: ${remainingInstances.length}`);
    } else {
      console.log(`❌ Recurring task deletion failed: ${deleteResponse.status}`);
    }
    
    console.log('\n🎉 Recurring task functionality test completed!');
    
  } catch (error) {
    console.error('❌ Error during recurring task test:', error);
    console.error('❌ Stack trace:', error.stack);
  }
}

async function main() {
  console.log('🚀 Starting recurring task functionality test...\n');
  await testRecurringTaskFunctionality();
  process.exit(0);
}

main().catch(console.error);
