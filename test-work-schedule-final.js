// Final test for work schedule system
import 'dotenv/config';

async function testWorkScheduleFinal() {
  console.log('🧪 Testing Work Schedule System - Final Test...\n');

  try {
    console.log('='.repeat(60));
    console.log('📅 TESTING WORK SCHEDULE SYSTEM WITH REAL DATA');
    console.log('='.repeat(60));
    
    // Test 1: Create a recurring appointment that would fall on weekends
    console.log('\n📋 Test 1: Create recurring appointment (daily, including weekends)');
    
    const recurringAppointment = {
      title: "Daily Standup - Work Schedule Test",
      description: "Testing work schedule compliance",
      date: "2024-08-02", // Friday
      startTime: "10:00",
      durationMinutes: 30,
      isRecurring: true,
      recurrencePattern: "daily",
      recurrenceInterval: 1,
      recurrenceEndCount: 7, // 7 days to cover weekend
      isPomodoro: false,
      assignedUserId: 8 // Ryan's ID
    };

    console.log('📊 Creating recurring appointment:', {
      title: recurringAppointment.title,
      startDate: recurringAppointment.date,
      pattern: recurringAppointment.recurrencePattern,
      count: recurringAppointment.recurrenceEndCount,
      userId: recurringAppointment.assignedUserId
    });

    const createResponse = await fetch('http://localhost:5000/api/appointments/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recurringAppointment)
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log(`✅ Created recurring appointment: ${result.instances.length} instances`);
      
      // Analyze the created instances
      console.log('\n📊 Analyzing created instances:');
      result.instances.forEach((instance, index) => {
        const date = new Date(instance.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const wasRescheduled = instance.wasRescheduledFromWeekend;
        const isOvertime = instance.isOvertime;
        const withinWorkHours = instance.isWithinWorkHours;
        
        let status = '✅ WEEKDAY';
        if (isWeekend) status = '🚫 WEEKEND';
        if (isOvertime) status += ' ⏰ OVERTIME';
        if (!withinWorkHours && !isOvertime) status += ' ❌ OUTSIDE HOURS';
        
        console.log(`   ${index + 1}. ${instance.date} (${dayName}) ${status}`);
        
        if (wasRescheduled && instance.originalDate) {
          const originalDate = new Date(instance.originalDate);
          const originalDayName = originalDate.toLocaleDateString('en-US', { weekday: 'long' });
          console.log(`      📅 Rescheduled from: ${instance.originalDate} (${originalDayName})`);
        }
        
        if (instance.workScheduleViolation) {
          console.log(`      ⚠️ Violation: ${instance.workScheduleViolation}`);
        }
      });
      
      // Check if any weekend appointments were created
      const weekendInstances = result.instances.filter(instance => {
        const date = new Date(instance.date);
        return date.getDay() === 0 || date.getDay() === 6;
      });
      
      if (weekendInstances.length === 0) {
        console.log('\n✅ SUCCESS: No weekend appointments were created');
      } else {
        console.log(`\n❌ PROBLEM: ${weekendInstances.length} weekend appointments were created:`);
        weekendInstances.forEach(instance => {
          const date = new Date(instance.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          console.log(`   - ${instance.date} (${dayName})`);
        });
      }
      
      // Test 2: Try to create appointment during lunch break
      console.log('\n📋 Test 2: Try to create appointment during lunch break');
      
      const lunchAppointment = {
        title: "Lunch Meeting Test",
        description: "Testing lunch break restriction",
        date: "2024-08-05", // Monday
        startTime: "12:30",
        durationMinutes: 30,
        isPomodoro: false,
        assignedUserId: 8
      };

      const lunchResponse = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lunchAppointment)
      });

      if (lunchResponse.ok) {
        const lunchResult = await lunchResponse.json();
        console.log(`⚠️ Lunch appointment created (should be blocked): ${lunchResult.id}`);
        
        // Clean up
        await fetch(`http://localhost:5000/api/appointments/${lunchResult.id}`, {
          method: 'DELETE'
        });
      } else {
        const error = await lunchResponse.text();
        console.log(`✅ Lunch appointment blocked: ${error}`);
      }
      
      // Test 3: Create after-hours appointment (should be marked as overtime)
      console.log('\n📋 Test 3: Create after-hours appointment (overtime)');
      
      const overtimeAppointment = {
        title: "After Hours Meeting",
        description: "Testing overtime/encaixe functionality",
        date: "2024-08-05", // Monday
        startTime: "19:00",
        durationMinutes: 60,
        isPomodoro: false,
        assignedUserId: 8,
        allowOverlap: true // Allow overtime
      };

      const overtimeResponse = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overtimeAppointment)
      });

      if (overtimeResponse.ok) {
        const overtimeResult = await overtimeResponse.json();
        console.log(`✅ Overtime appointment created: ${overtimeResult.id}`);
        console.log(`   📊 Is overtime: ${overtimeResult.isOvertime}`);
        console.log(`   📊 Within work hours: ${overtimeResult.isWithinWorkHours}`);
        console.log(`   📊 Allow overlap: ${overtimeResult.allowOverlap}`);
        
        // Clean up
        await fetch(`http://localhost:5000/api/appointments/${overtimeResult.id}`, {
          method: 'DELETE'
        });
      } else {
        const error = await overtimeResponse.text();
        console.log(`❌ Overtime appointment failed: ${error}`);
      }
      
      // Cleanup recurring appointments
      console.log('\n🧹 Cleaning up test appointments...');
      
      // Delete template
      await fetch(`http://localhost:5000/api/appointments/${result.template.id}`, {
        method: 'DELETE'
      });
      
      // Delete instances
      for (const instance of result.instances) {
        await fetch(`http://localhost:5000/api/appointments/${instance.id}`, {
          method: 'DELETE'
        });
      }
      
      console.log('✅ Cleanup completed');
      
    } else {
      const error = await createResponse.text();
      console.log(`❌ Failed to create recurring appointment: ${error}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 WORK SCHEDULE SYSTEM FINAL TEST COMPLETED');
    console.log('='.repeat(60));
    
    console.log('\n📊 EXPECTED BEHAVIOR:');
    console.log('✅ Weekend appointments should be moved to Monday');
    console.log('✅ Lunch break appointments should be blocked');
    console.log('✅ After-hours appointments should be marked as overtime');
    console.log('✅ Regular work hours appointments should work normally');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Start server first, then run test
async function startServerAndTest() {
  console.log('🚀 Starting server...');
  
  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await testWorkScheduleFinal();
}

startServerAndTest().catch(console.error);
