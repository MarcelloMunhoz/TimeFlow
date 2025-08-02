// Test weekend blocking specifically
import 'dotenv/config';

async function testWeekendBlocking() {
  console.log('🧪 Testing Weekend Blocking...\n');

  try {
    // Test 1: Try to create a single appointment on Saturday
    console.log('📋 Test 1: Try to create appointment on Saturday');
    
    const saturdayAppointment = {
      title: "Saturday Test Meeting",
      description: "This should be blocked",
      date: "2024-08-04", // Saturday (corrected date)
      startTime: "10:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8 // Ryan (has work schedule)
    };

    console.log('📊 Attempting to create Saturday appointment...');
    const satResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saturdayAppointment)
    });

    console.log(`Response status: ${satResponse.status}`);
    
    if (satResponse.ok) {
      const result = await satResponse.json();
      console.log(`❌ PROBLEM: Saturday appointment was created! ID: ${result.id}`);
      console.log(`   📊 Date: ${result.date}`);
      console.log(`   📊 Is within work hours: ${result.isWithinWorkHours}`);
      console.log(`   📊 Is overtime: ${result.isOvertime}`);
      console.log(`   📊 Work schedule violation: ${result.workScheduleViolation}`);
      
      // Clean up
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, {
        method: 'DELETE'
      });
      console.log('🧹 Cleaned up Saturday appointment');
      
    } else {
      const error = await satResponse.text();
      console.log(`✅ SUCCESS: Saturday appointment was blocked!`);
      console.log(`   📊 Error: ${error}`);
    }
    
    // Test 2: Try to create a single appointment on Sunday
    console.log('\n📋 Test 2: Try to create appointment on Sunday');
    
    const sundayAppointment = {
      title: "Sunday Test Meeting",
      description: "This should also be blocked",
      date: "2024-08-05", // Sunday (corrected date)
      startTime: "14:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8 // Ryan (has work schedule)
    };

    console.log('📊 Attempting to create Sunday appointment...');
    const sunResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sundayAppointment)
    });

    console.log(`Response status: ${sunResponse.status}`);
    
    if (sunResponse.ok) {
      const result = await sunResponse.json();
      console.log(`❌ PROBLEM: Sunday appointment was created! ID: ${result.id}`);
      console.log(`   📊 Date: ${result.date}`);
      console.log(`   📊 Is within work hours: ${result.isWithinWorkHours}`);
      console.log(`   📊 Is overtime: ${result.isOvertime}`);
      console.log(`   📊 Work schedule violation: ${result.workScheduleViolation}`);
      
      // Clean up
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, {
        method: 'DELETE'
      });
      console.log('🧹 Cleaned up Sunday appointment');
      
    } else {
      const error = await sunResponse.text();
      console.log(`✅ SUCCESS: Sunday appointment was blocked!`);
      console.log(`   📊 Error: ${error}`);
    }
    
    // Test 3: Try to create appointment during lunch break
    console.log('\n📋 Test 3: Try to create appointment during lunch break');
    
    const lunchAppointment = {
      title: "Lunch Meeting Test",
      description: "This should be blocked",
      date: "2024-08-06", // Monday (corrected date)
      startTime: "12:30",
      durationMinutes: 30,
      isPomodoro: false,
      assignedUserId: 8 // Ryan (has work schedule)
    };

    console.log('📊 Attempting to create lunch break appointment...');
    const lunchResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lunchAppointment)
    });

    console.log(`Response status: ${lunchResponse.status}`);
    
    if (lunchResponse.ok) {
      const result = await lunchResponse.json();
      console.log(`❌ PROBLEM: Lunch break appointment was created! ID: ${result.id}`);
      
      // Clean up
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, {
        method: 'DELETE'
      });
      console.log('🧹 Cleaned up lunch appointment');
      
    } else {
      const error = await lunchResponse.text();
      console.log(`✅ SUCCESS: Lunch break appointment was blocked!`);
      console.log(`   📊 Error: ${error}`);
    }
    
    // Test 4: Create valid appointment (Monday morning)
    console.log('\n📋 Test 4: Create valid appointment (Monday morning)');
    
    const validAppointment = {
      title: "Valid Morning Meeting",
      description: "This should work",
      date: "2024-08-06", // Monday (corrected date)
      startTime: "09:00",
      durationMinutes: 60,
      isPomodoro: false,
      assignedUserId: 8 // Ryan (has work schedule)
    };

    console.log('📊 Attempting to create valid appointment...');
    const validResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAppointment)
    });

    console.log(`Response status: ${validResponse.status}`);
    
    if (validResponse.ok) {
      const result = await validResponse.json();
      console.log(`✅ SUCCESS: Valid appointment was created! ID: ${result.id}`);
      console.log(`   📊 Date: ${result.date}`);
      console.log(`   📊 Is within work hours: ${result.isWithinWorkHours}`);
      console.log(`   📊 Is overtime: ${result.isOvertime}`);
      console.log(`   📊 Work schedule violation: ${result.workScheduleViolation || 'None'}`);
      
      // Clean up
      await fetch(`http://localhost:5000/api/appointments/${result.id}`, {
        method: 'DELETE'
      });
      console.log('🧹 Cleaned up valid appointment');
      
    } else {
      const error = await validResponse.text();
      console.log(`❌ PROBLEM: Valid appointment was blocked!`);
      console.log(`   📊 Error: ${error}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 WEEKEND BLOCKING TEST COMPLETED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWeekendBlocking().catch(console.error);
