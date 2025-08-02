// Test script to verify recurring appointments weekend handling
import 'dotenv/config';

async function testRecurringWeekendFix() {
  console.log('🧪 Testing Recurring Appointments Weekend Fix...\n');

  try {
    console.log('='.repeat(60));
    console.log('📅 TESTING WEEKEND HANDLING IN RECURRING APPOINTMENTS');
    console.log('='.repeat(60));
    
    // Test 1: Create a daily recurring appointment that would fall on weekends
    console.log('\n📋 Test 1: Creating daily recurring appointment starting on Friday');
    
    // Start on a Friday (2024-08-02 was a Friday)
    const fridayDate = '2024-08-02';
    
    const recurringAppointment = {
      title: "Daily Meeting - Weekend Test",
      description: "Testing weekend handling for recurring appointments",
      date: fridayDate,
      startTime: "10:00",
      durationMinutes: 60,
      isRecurring: true,
      recurrencePattern: "daily",
      recurrenceInterval: 1,
      recurrenceEndCount: 7, // 7 days to cover weekend
      isPomodoro: false
    };

    console.log('📊 Creating recurring appointment:', {
      title: recurringAppointment.title,
      startDate: recurringAppointment.date,
      pattern: recurringAppointment.recurrencePattern,
      count: recurringAppointment.recurrenceEndCount
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
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const wasRescheduled = instance.wasRescheduledFromWeekend;
        
        console.log(`   ${index + 1}. ${instance.date} (${dayName}) ${isWeekend ? '🚫 WEEKEND' : '✅ WEEKDAY'} ${wasRescheduled ? '📅 RESCHEDULED' : ''}`);
        
        if (wasRescheduled && instance.originalDate) {
          const originalDate = new Date(instance.originalDate);
          const originalDayName = originalDate.toLocaleDateString('pt-BR', { weekday: 'long' });
          console.log(`      Original: ${instance.originalDate} (${originalDayName})`);
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
          const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
          console.log(`   - ${instance.date} (${dayName})`);
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
    
    // Test 2: Test the weekend detection logic directly
    console.log('\n📋 Test 2: Testing weekend detection logic');
    
    const testDates = [
      '2024-08-02', // Friday
      '2024-08-03', // Saturday
      '2024-08-04', // Sunday
      '2024-08-05', // Monday
      '2024-08-06', // Tuesday
    ];
    
    console.log('\n📊 Weekend detection test:');
    testDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      console.log(`   ${dateStr} (${dayName}): ${isWeekend ? '🚫 Weekend' : '✅ Weekday'}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 RECURRING APPOINTMENTS WEEKEND TEST COMPLETED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRecurringWeekendFix().catch(console.error);
