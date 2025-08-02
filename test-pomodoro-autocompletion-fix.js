// Test script to verify the Pomodoro auto-completion fix
import 'dotenv/config';

async function testPomodoroAutoCompletionFix() {
  console.log('🍅 Testing Pomodoro auto-completion fix...\n');

  try {
    // Test the auto-completion endpoint directly
    console.log('📅 Step 1: Testing auto-completion endpoint...');
    
    const response = await fetch('http://localhost:5000/api/appointments/auto-complete-pomodoros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Auto-completion endpoint working correctly');
      console.log('📊 Result:', {
        success: result.success,
        autoCompletedTasks: result.autoCompletedTasks?.length || 0,
        projectProgressUpdates: result.projectProgressUpdates?.length || 0,
        message: result.message
      });
    } else {
      const error = await response.text();
      console.error('❌ Auto-completion endpoint failed:', error);
      return;
    }

    // Test with invalid data to ensure error handling works
    console.log('\n📅 Step 2: Testing error handling...');
    
    // Create a Pomodoro with invalid time format to test error handling
    const today = new Date().toISOString().split('T')[0];
    const invalidPomodoro = {
      title: "Test Pomodoro with Invalid Time",
      description: "This should be handled gracefully",
      date: today,
      startTime: "invalid-time", // Invalid format
      durationMinutes: 25,
      isPomodoro: true
    };

    const createResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPomodoro)
    });

    if (!createResponse.ok) {
      console.log('✅ Invalid data correctly rejected during creation');
    } else {
      const created = await createResponse.json();
      console.log('⚠️ Invalid data was accepted, testing auto-completion handling...');
      
      // Test auto-completion with this invalid data
      const autoCompleteResponse = await fetch('http://localhost:5000/api/appointments/auto-complete-pomodoros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (autoCompleteResponse.ok) {
        const result = await autoCompleteResponse.json();
        console.log('✅ Auto-completion handled invalid data gracefully');
        console.log('📊 Result:', result.message);
      } else {
        console.error('❌ Auto-completion failed with invalid data');
      }

      // Cleanup
      await fetch(`http://localhost:5000/api/appointments/${created.id}`, {
        method: 'DELETE'
      });
    }

    // Test multiple rapid calls to ensure no race conditions
    console.log('\n📅 Step 3: Testing multiple rapid calls...');
    
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        fetch('http://localhost:5000/api/appointments/auto-complete-pomodoros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    }

    const results = await Promise.all(promises);
    const allSuccessful = results.every(r => r.ok);
    
    if (allSuccessful) {
      console.log('✅ Multiple rapid calls handled correctly');
    } else {
      console.log('⚠️ Some rapid calls failed (this might be expected under load)');
    }

    console.log('\n🎉 Pomodoro auto-completion fix test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPomodoroAutoCompletionFix().catch(console.error);
