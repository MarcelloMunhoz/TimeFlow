// Final test for recurring appointments with weekend blocking
import 'dotenv/config';

async function testRecurringFinal() {
  console.log('🧪 Testing Recurring Appointments - Final Test...\n');

  try {
    console.log('='.repeat(60));
    console.log('📅 TESTING RECURRING APPOINTMENTS WEEKEND BLOCKING');
    console.log('='.repeat(60));
    
    // Test: Create a daily recurring appointment starting on Friday
    console.log('\n📋 Creating daily recurring appointment starting on Friday');
    
    const recurringAppointment = {
      title: "Daily Team Meeting - Final Test",
      description: "Testing weekend blocking in recurring appointments",
      date: "2024-08-02", // Thursday
      startTime: "10:00",
      durationMinutes: 30,
      isRecurring: true,
      recurrencePattern: "daily",
      recurrenceInterval: 1,
      recurrenceEndCount: 7, // 7 days to cover weekend
      isPomodoro: false,
      assignedUserId: 8 // Ryan (has work schedule)
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

    console.log(`Response status: ${createResponse.status}`);

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
      
      // Check for proper rescheduling
      const rescheduledInstances = result.instances.filter(instance => instance.wasRescheduledFromWeekend);
      
      if (rescheduledInstances.length > 0) {
        console.log(`\n📅 Rescheduled instances: ${rescheduledInstances.length}`);
        rescheduledInstances.forEach(instance => {
          const originalDate = new Date(instance.originalDate);
          const finalDate = new Date(instance.date);
          const originalDay = originalDate.toLocaleDateString('en-US', { weekday: 'long' });
          const finalDay = finalDate.toLocaleDateString('en-US', { weekday: 'long' });
          console.log(`   ${instance.originalDate} (${originalDay}) → ${instance.date} (${finalDay})`);
        });
      }
      
      // Cleanup - delete the created appointments
      console.log('\n🧹 Cleaning up created appointments...');
      
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
    console.log('🎉 RECURRING APPOINTMENTS FINAL TEST COMPLETED');
    console.log('='.repeat(60));
    
    console.log('\n📊 EXPECTED BEHAVIOR:');
    console.log('✅ Thursday appointment: Created normally');
    console.log('✅ Friday appointment: Created normally');
    console.log('✅ Saturday appointment: Moved to Monday');
    console.log('✅ Sunday appointment: Moved to Monday (or Tuesday if Monday is taken)');
    console.log('✅ Monday appointment: Created normally');
    console.log('✅ Tuesday appointment: Created normally');
    console.log('✅ Wednesday appointment: Created normally');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRecurringFinal().catch(console.error);
