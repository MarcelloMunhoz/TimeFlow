// Using native fetch (Node.js 18+)

const API_BASE = 'http://localhost:5000/api';

async function apiRequest(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseData = await response.text();
  
  let parsedData;
  try {
    parsedData = JSON.parse(responseData);
  } catch (e) {
    parsedData = responseData;
  }

  return {
    status: response.status,
    ok: response.ok,
    data: parsedData
  };
}

async function testOverlapFix() {
  console.log('🧪 TESTING OVERLAP FIX');
  console.log('='.repeat(50));

  const today = new Date().toISOString().split('T')[0];
  const testTime = "23:30"; // Use a time that's likely to be free
  
  try {
    // Step 1: Create first appointment
    console.log('\n📅 Step 1: Creating first appointment...');
    const firstAppointment = {
      title: "Primeira Reunião",
      description: "Reunião de teste",
      date: today,
      startTime: testTime,
      durationMinutes: 60,
      isPomodoro: false,
      allowOverlap: false // Normal appointment, should check conflicts
    };

    const result1 = await apiRequest('POST', '/appointments', firstAppointment);
    console.log(`   Status: ${result1.status}`);
    
    if (result1.ok) {
      console.log(`   ✅ First appointment created successfully`);
      console.log(`   📋 ID: ${result1.data.id}, Title: "${result1.data.title}"`);
    } else {
      console.log(`   ❌ Failed to create first appointment: ${JSON.stringify(result1.data)}`);
      return;
    }

    // Step 2: Try to create conflicting appointment WITHOUT allowOverlap
    console.log('\n📅 Step 2: Creating conflicting appointment WITHOUT allowOverlap...');
    const conflictingAppointment = {
      title: "Segunda Reunião (Conflito)",
      description: "Esta deveria falhar",
      date: today,
      startTime: testTime,
      durationMinutes: 30,
      isPomodoro: false,
      allowOverlap: false // Should fail due to conflict
    };

    const result2 = await apiRequest('POST', '/appointments', conflictingAppointment);
    console.log(`   Status: ${result2.status}`);
    
    if (result2.status === 409) {
      console.log(`   ✅ Correctly blocked conflicting appointment`);
      console.log(`   📋 Error: ${result2.data.message}`);
    } else if (result2.ok) {
      console.log(`   ❌ ERROR: Should have blocked this appointment!`);
      console.log(`   📋 Unexpected success: ${JSON.stringify(result2.data)}`);
    } else {
      console.log(`   ❌ Unexpected error: ${JSON.stringify(result2.data)}`);
    }

    // Step 3: Create conflicting appointment WITH allowOverlap
    console.log('\n📅 Step 3: Creating conflicting appointment WITH allowOverlap...');
    const overlapAppointment = {
      title: "Segunda Reunião (Encaixe)",
      description: "Esta deveria funcionar com allowOverlap",
      date: today,
      startTime: testTime,
      durationMinutes: 30,
      isPomodoro: false,
      allowOverlap: true // Should succeed despite conflict
    };

    const result3 = await apiRequest('POST', '/appointments', overlapAppointment);
    console.log(`   Status: ${result3.status}`);
    
    if (result3.ok) {
      console.log(`   ✅ Successfully created overlapping appointment with allowOverlap`);
      console.log(`   📋 ID: ${result3.data.id}, Title: "${result3.data.title}"`);
    } else {
      console.log(`   ❌ ERROR: Should have allowed this appointment with allowOverlap!`);
      console.log(`   📋 Error: ${JSON.stringify(result3.data)}`);
    }

    // Step 4: Verify appointments were created
    console.log('\n📅 Step 4: Verifying created appointments...');
    const appointmentsResult = await apiRequest('GET', '/appointments');
    
    if (appointmentsResult.ok) {
      const todayAppointments = appointmentsResult.data.filter(apt => apt.date === today);
      console.log(`   📊 Total appointments today: ${todayAppointments.length}`);
      
      todayAppointments.forEach(apt => {
        console.log(`   📋 ${apt.id}: "${apt.title}" at ${apt.startTime} (${apt.durationMinutes}min)`);
      });

      // Check for overlaps
      const overlaps = findOverlaps(todayAppointments);
      if (overlaps.length > 0) {
        console.log(`   ⚠️  ${overlaps.length} overlap(s) detected (this is expected):`);
        overlaps.forEach(overlap => {
          console.log(`      🔴 "${overlap.apt1.title}" overlaps with "${overlap.apt2.title}"`);
        });
      } else {
        console.log(`   ✅ No overlaps detected`);
      }
    }

    console.log('\n🎉 OVERLAP FIX TEST COMPLETED');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function findOverlaps(appointments) {
  const overlaps = [];
  
  for (let i = 0; i < appointments.length; i++) {
    for (let j = i + 1; j < appointments.length; j++) {
      const apt1 = appointments[i];
      const apt2 = appointments[j];
      
      // Skip cancelled appointments
      if (apt1.status === 'cancelled' || apt2.status === 'cancelled') continue;
      
      const apt1Start = timeToMinutes(apt1.startTime);
      const apt1End = apt1Start + apt1.durationMinutes;
      const apt2Start = timeToMinutes(apt2.startTime);
      const apt2End = apt2Start + apt2.durationMinutes;
      
      // Check for overlap
      if (apt1Start < apt2End && apt1End > apt2Start) {
        overlaps.push({ apt1, apt2 });
      }
    }
  }
  
  return overlaps;
}

// Run the test
testOverlapFix().catch(console.error);
