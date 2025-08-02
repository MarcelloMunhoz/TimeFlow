// Debug recurring appointments to understand the exact problem
import 'dotenv/config';

async function testRecurringDebug() {
  console.log('🧪 Debug Recurring Appointments...\n');

  try {
    // Test with a very specific date range to understand the problem
    console.log('📋 Creating recurring appointment starting Thursday for 7 days');
    
    const recurringAppointment = {
      title: "Debug Recurring Test",
      description: "Understanding the weekend blocking issue",
      date: "2024-08-02", // Thursday (corrected to actual Thursday)
      startTime: "10:00",
      durationMinutes: 30,
      isRecurring: true,
      recurrencePattern: "daily",
      recurrenceInterval: 1,
      recurrenceEndCount: 7, // 7 days: Thu, Fri, Sat, Sun, Mon, Tue, Wed
      isPomodoro: false,
      assignedUserId: 8 // Ryan
    };

    console.log('📊 Expected schedule:');
    for (let i = 0; i < 7; i++) {
      const date = new Date('2024-08-02');
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      console.log(`   ${i + 1}. ${dateStr} (${dayName}) ${isWeekend ? '🚫 SHOULD BE SKIPPED' : '✅ SHOULD BE CREATED'}`);
    }

    console.log('\n📊 Creating appointment...');
    const createResponse = await fetch('http://localhost:5000/api/appointments/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recurringAppointment)
    });

    console.log(`Response status: ${createResponse.status}`);

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log(`✅ Created: ${result.instances.length} instances`);
      
      console.log('\n📊 Actual instances created:');
      result.instances.forEach((instance, index) => {
        const date = new Date(instance.date);
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const wasRescheduled = instance.wasRescheduledFromWeekend;
        
        let status = isWeekend ? '❌ WEEKEND CREATED' : '✅ WEEKDAY';
        if (wasRescheduled) status += ' (RESCHEDULED)';
        
        console.log(`   ${index + 1}. ${instance.date} (${dayName}) ${status}`);
        
        if (wasRescheduled && instance.originalDate) {
          const originalDate = new Date(instance.originalDate);
          const originalDayName = originalDate.toLocaleDateString('pt-BR', { weekday: 'long' });
          console.log(`      📅 Original: ${instance.originalDate} (${originalDayName})`);
        }
      });
      
      // Analysis
      const weekendInstances = result.instances.filter(instance => {
        const date = new Date(instance.date);
        return date.getDay() === 0 || date.getDay() === 6;
      });
      
      const mondayInstances = result.instances.filter(instance => {
        const date = new Date(instance.date);
        return date.getDay() === 1;
      });
      
      console.log('\n📊 Analysis:');
      console.log(`   Weekend instances created: ${weekendInstances.length} (should be 0)`);
      console.log(`   Monday instances: ${mondayInstances.length}`);
      console.log(`   Total instances: ${result.instances.length} (should be 5: Thu, Fri, Mon, Tue, Wed)`);
      
      if (weekendInstances.length > 0) {
        console.log('\n❌ PROBLEM: Weekend instances found:');
        weekendInstances.forEach(instance => {
          const date = new Date(instance.date);
          const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
          console.log(`   - ${instance.date} (${dayName})`);
        });
      }
      
      // Cleanup
      console.log('\n🧹 Cleaning up...');
      await fetch(`http://localhost:5000/api/appointments/${result.template.id}`, { method: 'DELETE' });
      for (const instance of result.instances) {
        await fetch(`http://localhost:5000/api/appointments/${instance.id}`, { method: 'DELETE' });
      }
      console.log('✅ Cleanup completed');
      
    } else {
      const error = await createResponse.text();
      console.log(`❌ Failed: ${error}`);
    }
    
    // Test after-hours appointment
    console.log('\n📋 Testing after-hours appointment (should be marked as encaixe)');
    
    const afterHoursAppointment = {
      title: "After Hours Meeting",
      description: "Should be marked as encaixe/overtime",
      date: "2024-08-06", // Monday
      startTime: "19:00", // 7 PM (after 18:00)
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8
    };

    const afterHoursResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(afterHoursAppointment)
    });

    console.log(`After hours response status: ${afterHoursResponse.status}`);

    if (afterHoursResponse.ok) {
      const result = await afterHoursResponse.json();
      console.log(`✅ After hours appointment created: ID ${result.id}`);
      console.log(`   📊 Is within work hours: ${result.isWithinWorkHours}`);
      console.log(`   📊 Is overtime: ${result.isOvertime}`);
      console.log(`   📊 Allow overlap: ${result.allowOverlap}`);
      
      if (result.isOvertime) {
        console.log('✅ SUCCESS: Correctly marked as overtime/encaixe');
      } else {
        console.log('❌ PROBLEM: Should be marked as overtime/encaixe');
      }
      
      // Cleanup
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, { method: 'DELETE' });
      console.log('🧹 Cleaned up after hours appointment');
      
    } else {
      const error = await afterHoursResponse.text();
      console.log(`❌ After hours appointment failed: ${error}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

testRecurringDebug().catch(console.error);
